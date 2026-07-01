import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SystemRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const [users, housingUnits, rooms, totalReservations, activeReservations, pendingInvitations] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.housingUnit.count(),
        this.prisma.room.count(),
        this.prisma.reservation.count(),
        this.prisma.reservation.count({ where: { status: 'ACTIVE' } }),
        this.prisma.invitation.count({ where: { status: 'PENDING' } }),
      ]);
    return {
      users,
      housingUnits,
      rooms,
      totalReservations,
      activeReservations,
      pendingInvitations,
    };
  }

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        systemRole: true,
        createdAt: true,
        _count: { select: { ownedUnits: true, memberships: true, reservations: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      systemRole: u.systemRole,
      createdAt: u.createdAt,
      ownedUnitCount: u._count.ownedUnits,
      membershipCount: u._count.memberships,
      reservationCount: u._count.reservations,
    }));
  }

  async setUserRole(actingUserId: string, userId: string, systemRole: SystemRole) {
    if (actingUserId === userId && systemRole !== 'ADMIN') {
      throw new ConflictException("You can't remove your own admin role");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id: userId }, data: { systemRole } });
  }

  async deleteUser(actingUserId: string, userId: string) {
    if (actingUserId === userId) throw new ConflictException("You can't delete your own account here");
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { ownedUnits: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user._count.ownedUnits > 0) {
      throw new ConflictException(
        'This user still owns households — delete or reassign those first',
      );
    }
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async listUnits() {
    const units = await this.prisma.housingUnit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { email: true } },
        _count: { select: { rooms: true, memberships: true } },
      },
    });
    return units.map((u) => ({
      id: u.id,
      name: u.name,
      address: u.address,
      timezone: u.timezone,
      createdAt: u.createdAt,
      ownerEmail: u.owner.email,
      roomCount: u._count.rooms,
      memberCount: u._count.memberships,
    }));
  }

  async deleteUnit(unitId: string) {
    const unit = await this.prisma.housingUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Housing unit not found');
    await this.prisma.housingUnit.delete({ where: { id: unitId } });
  }

  async listReservations() {
    const reservations = await this.prisma.reservation.findMany({
      orderBy: { startAt: 'desc' },
      take: 200,
      include: {
        user: { select: { email: true } },
        room: { include: { unit: { select: { name: true } } } },
      },
    });
    return reservations.map((r) => ({
      id: r.id,
      startAt: r.startAt,
      endAt: r.endAt,
      status: r.status,
      roomName: r.room.name,
      unitName: r.room.unit.name,
      userEmail: r.user.email,
    }));
  }

  async deleteReservation(reservationId: string) {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    await this.prisma.reservation.delete({ where: { id: reservationId } });
  }
}
