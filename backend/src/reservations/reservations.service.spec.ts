import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import type { Room } from '@prisma/client';
import type { HousingUnitsService } from '../housing-units/housing-units.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from './reservations.service';

/**
 * Unit tests for the F-11 reservation rule engine, with Prisma mocked.
 * The unit's timezone is Europe/Bratislava (UTC+2 in July), so e.g.
 * 06:00Z = 08:00 wall clock. TIME columns are 1970-anchored UTC dates.
 */

const USER = 'user-1';
const UNIT = 'unit-1';
const ROOM_ID = 'room-1';

const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
const at = (iso: string) => new Date(iso);

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: ROOM_ID,
    unitId: UNIT,
    name: 'Bathroom',
    description: null,
    maxReservationHours: null,
    maxReservationsPerDay: null,
    minGapMinutes: null,
    availableFrom: null,
    availableTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ReservationsService (rule engine)', () => {
  let prisma: {
    room: { findUnique: jest.Mock; findUniqueOrThrow: jest.Mock };
    housingUnit: { findUnique: jest.Mock };
    reservation: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let units: { assertMember: jest.Mock; assertOwner: jest.Mock };
  let service: ReservationsService;

  beforeEach(() => {
    prisma = {
      room: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
      housingUnit: {
        findUnique: jest.fn().mockResolvedValue({ timezone: 'Europe/Bratislava' }),
      },
      reservation: {
        findFirst: jest.fn().mockResolvedValue(null), // no overlap / gap conflict
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'res-new',
            status: 'ACTIVE',
            note: null,
            ...data,
          }),
        ),
        update: jest.fn(),
      },
    };
    units = {
      assertMember: jest.fn().mockResolvedValue('MEMBER'),
      assertOwner: jest.fn(),
    };
    service = new ReservationsService(
      prisma as unknown as PrismaService,
      units as unknown as HousingUnitsService,
    );
  });

  const create = (startAt: string, endAt: string, room = makeRoom()) => {
    prisma.room.findUnique.mockResolvedValue(room);
    return service.create(USER, ROOM_ID, { startAt, endAt });
  };

  it('creates a reservation when every rule passes', async () => {
    // 10:00–11:00 local on Jul 6.
    const dto = await create('2026-07-06T08:00:00.000Z', '2026-07-06T09:00:00.000Z');
    expect(prisma.reservation.create).toHaveBeenCalledWith({
      data: {
        roomId: ROOM_ID,
        userId: USER,
        startAt: at('2026-07-06T08:00:00.000Z'),
        endAt: at('2026-07-06T09:00:00.000Z'),
        note: null,
      },
    });
    expect(dto.isMine).toBe(true);
  });

  it('rejects end before or equal to start', async () => {
    await expect(create('2026-07-06T09:00:00.000Z', '2026-07-06T09:00:00.000Z')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.reservation.create).not.toHaveBeenCalled();
  });

  it('rejects a reservation crossing local midnight', async () => {
    // 23:00–01:00 local = 21:00Z–23:00Z; local day ends at 22:00Z.
    await expect(create('2026-07-06T21:00:00.000Z', '2026-07-06T23:00:00.000Z')).rejects.toThrow(
      'within a single day',
    );
  });

  it('allows a reservation ending exactly at local midnight', async () => {
    // 23:00–24:00 local = 21:00Z–22:00Z.
    await expect(
      create('2026-07-06T21:00:00.000Z', '2026-07-06T22:00:00.000Z'),
    ).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  describe('availability window (local wall clock)', () => {
    const room = makeRoom({
      availableFrom: time('06:00'),
      availableTo: time('23:00'),
    });

    it('rejects a start before the window opens', async () => {
      // 05:30–06:30 local = 03:30Z–04:30Z.
      await expect(
        create('2026-07-06T03:30:00.000Z', '2026-07-06T04:30:00.000Z', room),
      ).rejects.toThrow('only available from 06:00');
    });

    it('rejects an end after the window closes', async () => {
      // 22:30–23:30 local.
      await expect(
        create('2026-07-06T20:30:00.000Z', '2026-07-06T21:30:00.000Z', room),
      ).rejects.toThrow('only available until 23:00');
    });

    it('accepts a slot exactly filling the window edges', async () => {
      // 06:00–07:00 local.
      await expect(
        create('2026-07-06T04:00:00.000Z', '2026-07-06T05:00:00.000Z', room),
      ).resolves.toBeDefined();
    });
  });

  it('rejects a reservation longer than maxReservationHours', async () => {
    const room = makeRoom({ maxReservationHours: 2 });
    await expect(
      create('2026-07-06T08:00:00.000Z', '2026-07-06T10:30:00.000Z', room),
    ).rejects.toThrow('at most 2h');
  });

  it('rejects an overlap with any ACTIVE reservation (409)', async () => {
    prisma.reservation.findFirst.mockResolvedValueOnce({ id: 'existing' });
    await expect(create('2026-07-06T08:00:00.000Z', '2026-07-06T09:00:00.000Z')).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects when the user hit maxReservationsPerDay in this room', async () => {
    const room = makeRoom({ maxReservationsPerDay: 3 });
    prisma.reservation.count.mockResolvedValue(3);
    await expect(
      create('2026-07-06T08:00:00.000Z', '2026-07-06T09:00:00.000Z', room),
    ).rejects.toThrow('at most 3 reservations per day');
  });

  it('counts per-day reservations within the local day, not the UTC day', async () => {
    const room = makeRoom({ maxReservationsPerDay: 1 });
    await create('2026-07-06T08:00:00.000Z', '2026-07-06T09:00:00.000Z', room);
    expect(prisma.reservation.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        // Local Jul 6 runs 22:00Z Jul 5 → 22:00Z Jul 6.
        startAt: {
          gte: at('2026-07-05T22:00:00.000Z'),
          lt: at('2026-07-06T22:00:00.000Z'),
        },
      }),
    });
  });

  it('rejects a slot closer than minGapMinutes to the user’s own booking', async () => {
    const room = makeRoom({ minGapMinutes: 30 });
    prisma.reservation.findFirst
      .mockResolvedValueOnce(null) // overlap check passes
      .mockResolvedValueOnce({ id: 'nearby' }); // gap check finds a neighbour
    await expect(
      create('2026-07-06T08:00:00.000Z', '2026-07-06T09:00:00.000Z', room),
    ).rejects.toThrow('at least 30 minutes');
  });

  describe('update / cancel', () => {
    const existing = {
      id: 'res-1',
      roomId: ROOM_ID,
      userId: USER,
      startAt: at('2026-07-06T08:00:00.000Z'),
      endAt: at('2026-07-06T09:00:00.000Z'),
      note: null,
      status: 'ACTIVE',
    };

    it('re-validates rules excluding the reservation itself', async () => {
      prisma.reservation.findUnique.mockResolvedValue(existing);
      prisma.room.findUniqueOrThrow.mockResolvedValue(makeRoom());
      prisma.reservation.update.mockResolvedValue(existing);

      await service.update(USER, 'res-1', {
        endAt: '2026-07-06T10:00:00.000Z',
      });
      expect(prisma.reservation.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: { not: 'res-1' } }),
      });
    });

    it("refuses to touch someone else's reservation", async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...existing,
        userId: 'other',
      });
      await expect(service.cancel(USER, 'res-1')).rejects.toThrow(ForbiddenException);
    });

    it('refuses to update a cancelled reservation', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        ...existing,
        status: 'CANCELLED',
      });
      await expect(service.update(USER, 'res-1', { note: 'x' })).rejects.toThrow('cancelled');
    });

    it('cancel marks the row CANCELLED instead of deleting it', async () => {
      prisma.reservation.findUnique.mockResolvedValue(existing);
      await service.cancel(USER, 'res-1');
      expect(prisma.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'CANCELLED' },
      });
    });
  });
});
