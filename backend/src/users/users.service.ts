import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma, SystemRole, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** User fields safe to expose over the API — never includes passwordHash. */
export const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  systemRole: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Full record incl. passwordHash — for auth verification only, never returned to clients. */
  findByEmailWithHash(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  findByIdWithHash(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Update editable profile fields; rejects an email already used by someone else. */
  async updateProfile(
    id: string,
    data: { firstName?: string; lastName?: string; email?: string },
  ): Promise<PublicUser> {
    if (data.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email is already in use');
      }
    }
    return this.prisma.user.update({ where: { id }, data, select: publicUserSelect });
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    systemRole?: SystemRole;
  }): Promise<PublicUser> {
    return this.prisma.user.create({ data, select: publicUserSelect });
  }
}
