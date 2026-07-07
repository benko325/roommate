import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Room } from '@prisma/client';
import { apiError } from '../common/api-error';
import { dateToTimeString, minutesOfDay, timeStringToDate } from '../common/time';
import { HousingUnitsService } from '../housing-units/housing-units.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

function toDto(room: Room) {
  return {
    id: room.id,
    unitId: room.unitId,
    name: room.name,
    description: room.description,
    maxReservationHours: room.maxReservationHours,
    maxReservationsPerDay: room.maxReservationsPerDay,
    minGapMinutes: room.minGapMinutes,
    availableFrom: dateToTimeString(room.availableFrom),
    availableTo: dateToTimeString(room.availableTo),
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly units: HousingUnitsService,
  ) {}

  async create(userId: string, unitId: string, dto: CreateRoomDto) {
    await this.units.assertOwner(userId, unitId);
    this.assertWindowValid(dto.availableFrom, dto.availableTo);
    const room = await this.prisma.room.create({
      data: {
        unitId,
        name: dto.name,
        description: dto.description ?? null,
        maxReservationHours: dto.maxReservationHours ?? null,
        maxReservationsPerDay: dto.maxReservationsPerDay ?? null,
        minGapMinutes: dto.minGapMinutes ?? null,
        availableFrom: timeStringToDate(dto.availableFrom),
        availableTo: timeStringToDate(dto.availableTo),
      },
    });
    return toDto(room);
  }

  async findAll(userId: string, unitId: string) {
    await this.units.assertMember(userId, unitId);
    const rooms = await this.prisma.room.findMany({
      where: { unitId },
      orderBy: { name: 'asc' },
    });
    return rooms.map(toDto);
  }

  async findOne(userId: string, unitId: string, roomId: string) {
    await this.units.assertMember(userId, unitId);
    return toDto(await this.getRoomInUnit(unitId, roomId));
  }

  async update(userId: string, unitId: string, roomId: string, dto: UpdateRoomDto) {
    await this.units.assertOwner(userId, unitId);
    const existing = await this.getRoomInUnit(unitId, roomId);

    // Validate the availability window against the merged (new ∪ existing) values.
    const from =
      dto.availableFrom !== undefined
        ? dto.availableFrom
        : dateToTimeString(existing.availableFrom);
    const to =
      dto.availableTo !== undefined ? dto.availableTo : dateToTimeString(existing.availableTo);
    this.assertWindowValid(from, to);

    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.maxReservationHours !== undefined && {
          maxReservationHours: dto.maxReservationHours,
        }),
        ...(dto.maxReservationsPerDay !== undefined && {
          maxReservationsPerDay: dto.maxReservationsPerDay,
        }),
        ...(dto.minGapMinutes !== undefined && { minGapMinutes: dto.minGapMinutes }),
        ...(dto.availableFrom !== undefined && {
          availableFrom: timeStringToDate(dto.availableFrom),
        }),
        ...(dto.availableTo !== undefined && { availableTo: timeStringToDate(dto.availableTo) }),
      },
    });
    return toDto(room);
  }

  async remove(userId: string, unitId: string, roomId: string) {
    await this.units.assertOwner(userId, unitId);
    await this.getRoomInUnit(unitId, roomId);
    await this.prisma.room.delete({ where: { id: roomId } });
  }

  private async getRoomInUnit(unitId: string, roomId: string): Promise<Room> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.unitId !== unitId)
      throw new NotFoundException(apiError('room_not_found', 'Room not found'));
    return room;
  }

  private assertWindowValid(from?: string | null, to?: string | null) {
    if (from && to && minutesOfDay(to) <= minutesOfDay(from)) {
      throw new BadRequestException(
        apiError('available_range_invalid', 'availableTo must be later than availableFrom'),
      );
    }
  }
}
