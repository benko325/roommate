import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Reservation, Room, User } from '@prisma/client';
import { dateToTimeString } from '../common/time';
import { localDayEnd, localDayStart, localMinutesOfDay } from '../common/timezone';
import { HousingUnitsService } from '../housing-units/housing-units.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto';

type Author = Pick<User, 'id' | 'firstName' | 'lastName'>;

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

/** Wall-clock minutes-since-midnight of a Prisma TIME column (stored as UTC). */
function timeColumnMinutes(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly units: HousingUnitsService,
  ) {}

  async create(userId: string, roomId: string, dto: CreateReservationDto) {
    const room = await this.getRoomForMember(userId, roomId);
    const tz = await this.unitTimezone(room.unitId);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    await this.validate(room, userId, startAt, endAt, tz);

    const reservation = await this.prisma.reservation.create({
      data: { roomId, userId, startAt, endAt, note: dto.note ?? null },
    });
    return this.toDto(reservation, userId, true);
  }

  /** Availability for a room in an optional [from, to] window (ACTIVE only). */
  async listForRoom(userId: string, roomId: string, from?: string, to?: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    const role = await this.units.assertMember(userId, room.unitId);

    const reservations = await this.prisma.reservation.findMany({
      where: {
        roomId,
        status: 'ACTIVE',
        ...(from || to
          ? {
              startAt: { ...(to && { lt: new Date(to) }) },
              endAt: { ...(from && { gt: new Date(from) }) },
            }
          : {}),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startAt: 'asc' },
    });

    const isOwner = role === 'OWNER';
    return reservations.map((r) =>
      this.toDto(r, userId, r.userId === userId, isOwner ? r.user : null),
    );
  }

  /** Owner-only: every reservation in a unit, with authors and optional filters. */
  async listForUnit(
    userId: string,
    unitId: string,
    filters: { roomId?: string; userId?: string; from?: string; to?: string },
  ) {
    await this.units.assertOwner(userId, unitId);
    const reservations = await this.prisma.reservation.findMany({
      where: {
        room: { unitId },
        ...(filters.roomId && { roomId: filters.roomId }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.from && { endAt: { gt: new Date(filters.from) } }),
        ...(filters.to && { startAt: { lt: new Date(filters.to) } }),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startAt: 'desc' },
    });
    return reservations.map((r) => this.toDto(r, userId, r.userId === userId, r.user));
  }

  /** The caller's own reservations across all units. */
  async listMine(userId: string) {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      include: {
        room: { include: { unit: { select: { id: true, name: true, timezone: true } } } },
      },
      orderBy: { startAt: 'desc' },
    });
    return reservations.map((r) => ({
      ...this.toDto(r, userId, true),
      roomName: r.room.name,
      unitId: r.room.unit.id,
      unitName: r.room.unit.name,
      unitTimezone: r.room.unit.timezone,
    }));
  }

  async update(userId: string, reservationId: string, dto: UpdateReservationDto) {
    const reservation = await this.getOwnActive(userId, reservationId);
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: reservation.roomId } });

    const startAt = dto.startAt ? new Date(dto.startAt) : reservation.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : reservation.endAt;
    if (dto.startAt || dto.endAt) {
      const tz = await this.unitTimezone(room.unitId);
      await this.validate(room, userId, startAt, endAt, tz, reservationId);
    }

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        ...(dto.startAt && { startAt }),
        ...(dto.endAt && { endAt }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
    });
    return this.toDto(updated, userId, true);
  }

  async cancel(userId: string, reservationId: string) {
    await this.getOwnActive(userId, reservationId);
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' },
    });
  }

  // ---- helpers ----

  private async unitTimezone(unitId: string): Promise<string> {
    const unit = await this.prisma.housingUnit.findUnique({
      where: { id: unitId },
      select: { timezone: true },
    });
    return unit?.timezone ?? 'UTC';
  }

  private async getRoomForMember(userId: string, roomId: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');
    await this.units.assertMember(userId, room.unitId);
    return room;
  }

  private async getOwnActive(userId: string, reservationId: string): Promise<Reservation> {
    const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    if (reservation.userId !== userId) {
      throw new ForbiddenException('You can only change your own reservations');
    }
    if (reservation.status !== 'ACTIVE') {
      throw new BadRequestException('Reservation is cancelled');
    }
    return reservation;
  }

  /** Enforces the F-11 rules. Wall-clock rules use the unit's timezone. */
  private async validate(
    room: Room,
    userId: string,
    startAt: Date,
    endAt: Date,
    tz: string,
    excludeId?: string,
  ) {
    if (endAt <= startAt) {
      throw new BadRequestException('End time must be after start time');
    }

    const dayStart = localDayStart(startAt, tz);
    const dayEnd = localDayEnd(startAt, tz);
    if (endAt.getTime() > dayEnd.getTime()) {
      throw new BadRequestException('A reservation must be within a single day');
    }

    // Availability window (local time-of-day in the unit's timezone).
    const startMin = localMinutesOfDay(startAt, tz);
    const endMin = endAt.getTime() === dayEnd.getTime() ? 24 * 60 : localMinutesOfDay(endAt, tz);
    const from = room.availableFrom ? timeColumnMinutes(room.availableFrom) : null;
    const to = room.availableTo ? timeColumnMinutes(room.availableTo) : null;
    if (from !== null && startMin < from) {
      throw new BadRequestException(
        `Room is only available from ${dateToTimeString(room.availableFrom)}`,
      );
    }
    if (to !== null && endMin > to) {
      throw new BadRequestException(
        `Room is only available until ${dateToTimeString(room.availableTo)}`,
      );
    }

    // Max length.
    if (room.maxReservationHours) {
      const hours = (endAt.getTime() - startAt.getTime()) / HOUR_MS;
      if (hours > room.maxReservationHours) {
        throw new BadRequestException(
          `Reservations can be at most ${room.maxReservationHours}h long`,
        );
      }
    }

    const notSelf: Prisma.ReservationWhereInput = excludeId ? { id: { not: excludeId } } : {};

    // Overlap with any ACTIVE reservation in the room.
    const overlap = await this.prisma.reservation.findFirst({
      where: {
        ...notSelf,
        roomId: room.id,
        status: 'ACTIVE',
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (overlap) throw new ConflictException('This time slot overlaps an existing reservation');

    // Max reservations per day (same user, same room).
    if (room.maxReservationsPerDay) {
      const count = await this.prisma.reservation.count({
        where: {
          ...notSelf,
          roomId: room.id,
          userId,
          status: 'ACTIVE',
          startAt: { gte: dayStart, lt: dayEnd },
        },
      });
      if (count >= room.maxReservationsPerDay) {
        throw new BadRequestException(
          `You can make at most ${room.maxReservationsPerDay} reservations per day for this room`,
        );
      }
    }

    // Minimum gap between the user's own reservations in this room.
    if (room.minGapMinutes) {
      const gap = room.minGapMinutes * MINUTE_MS;
      const near = await this.prisma.reservation.findFirst({
        where: {
          ...notSelf,
          roomId: room.id,
          userId,
          status: 'ACTIVE',
          startAt: { lt: new Date(endAt.getTime() + gap) },
          endAt: { gt: new Date(startAt.getTime() - gap) },
        },
      });
      if (near) {
        throw new BadRequestException(
          `Leave at least ${room.minGapMinutes} minutes between your reservations`,
        );
      }
    }
  }

  private toDto(r: Reservation, userId: string, isMine: boolean, author: Author | null = null) {
    return {
      id: r.id,
      roomId: r.roomId,
      startAt: r.startAt,
      endAt: r.endAt,
      note: r.note,
      status: r.status,
      isMine,
      author,
    };
  }
}
