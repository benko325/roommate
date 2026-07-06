import { createHash, randomBytes } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Env } from '../config/env.schema';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { type PublicUser, UsersService } from '../users/users.service';
import type { JwtPayload } from './auth.types';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;
const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

type AuthResult = { accessToken: string; refreshToken: string; user: PublicUser };

/** SHA-256 hex — refresh tokens are high-entropy, so a fast hash is sufficient. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
    private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await this.users.findByEmailWithHash(dto.email);
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithHash(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    return this.issueTokens(user);
  }

  /** Rotate: validate the presented refresh token, revoke it, issue a fresh pair. */
  async refresh(presentedToken: string): Promise<AuthResult> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(presentedToken) },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(record.user);
  }

  /** Revoke a single refresh token (sign out). Idempotent. */
  async logout(presentedToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(presentedToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Always resolves (no email-existence disclosure); emails a link if the user exists. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmailWithHash(email);
    if (!user) return;

    const token = randomBytes(32).toString('base64url');
    const ttlMin = this.config.get('PASSWORD_RESET_TTL_MINUTES', { infer: true });
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMin * MINUTE_MS),
      },
    });
    this.mail.sendPasswordReset(user.email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('This reset link is invalid or has expired');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Sign the user out everywhere after a reset.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findByIdWithHash(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.updatePasswordHash(userId, passwordHash);
    // Force re-login everywhere after a password change.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: User | PublicUser): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.systemRole };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(32).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlDays * DAY_MS),
      },
    });

    const { id, email, firstName, lastName, systemRole, createdAt, updatedAt } = user;
    return {
      accessToken,
      refreshToken,
      user: { id, email, firstName, lastName, systemRole, createdAt, updatedAt },
    };
  }
}
