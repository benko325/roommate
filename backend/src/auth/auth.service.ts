import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { type PublicUser, UsersService } from '../users/users.service';
import type { JwtPayload } from './auth.types';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: PublicUser }> {
    const existing = await this.users.findByEmailWithHash(dto.email);
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: PublicUser }> {
    const user = await this.users.findByEmailWithHash(dto.email);
    // Compare even when the user is missing? Not needed here; message stays generic.
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    return this.issueToken(user);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findByIdWithHash(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.updatePasswordHash(userId, passwordHash);
  }

  private async issueToken(
    user: User | PublicUser,
  ): Promise<{ accessToken: string; user: PublicUser }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.systemRole,
    };
    const { id, email, firstName, lastName, systemRole, createdAt, updatedAt } = user;
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: { id, email, firstName, lastName, systemRole, createdAt, updatedAt },
    };
  }
}
