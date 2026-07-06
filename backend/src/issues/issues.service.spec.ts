import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { HousingUnitsService } from '../housing-units/housing-units.service';
import type { PrismaService } from '../prisma/prisma.service';
import { IssuesService } from './issues.service';

const USER = 'user-1';
const OWNER = 'owner-1';
const UNIT = 'unit-1';

const dbIssue = (overrides: Record<string, unknown> = {}) => ({
  id: 'issue-1',
  unitId: UNIT,
  reporterId: USER,
  roomId: null,
  reservationId: null,
  message: 'Broken tap',
  status: 'OPEN',
  createdAt: new Date(),
  resolvedAt: null,
  reporter: { firstName: 'Bob', lastName: 'Horvath' },
  room: null,
  reservation: null,
  ...overrides,
});

describe('IssuesService', () => {
  let prisma: {
    room: { findUnique: jest.Mock };
    reservation: { findUnique: jest.Mock };
    issue: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let units: { assertMember: jest.Mock; assertOwner: jest.Mock };
  let service: IssuesService;

  beforeEach(() => {
    prisma = {
      room: { findUnique: jest.fn() },
      reservation: { findUnique: jest.fn() },
      issue: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(dbIssue(data))),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    units = {
      assertMember: jest.fn().mockResolvedValue('MEMBER'),
      assertOwner: jest.fn(),
    };
    service = new IssuesService(
      prisma as unknown as PrismaService,
      units as unknown as HousingUnitsService,
    );
  });

  describe('create', () => {
    it('rejects a room from a different unit', async () => {
      prisma.room.findUnique.mockResolvedValue({
        id: 'room-x',
        unitId: 'other-unit',
      });
      await expect(service.create(USER, UNIT, { message: 'x', roomId: 'room-x' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.issue.create).not.toHaveBeenCalled();
    });

    it("rejects linking someone else's reservation", async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        userId: 'someone-else',
        roomId: 'room-1',
        room: { unitId: UNIT },
      });
      await expect(
        service.create(USER, UNIT, { message: 'x', reservationId: 'res-1' }),
      ).rejects.toThrow('does not belong to you');
    });

    it('rejects a reservation that is not in the selected room', async () => {
      prisma.room.findUnique.mockResolvedValue({ id: 'room-2', unitId: UNIT });
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        userId: USER,
        roomId: 'room-1',
        room: { unitId: UNIT },
      });
      await expect(
        service.create(USER, UNIT, {
          message: 'x',
          roomId: 'room-2',
          reservationId: 'res-1',
        }),
      ).rejects.toThrow('not in the selected room');
    });

    it('derives the room from a linked reservation', async () => {
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'res-1',
        userId: USER,
        roomId: 'room-1',
        room: { unitId: UNIT },
      });
      await service.create(USER, UNIT, {
        message: 'No hot water',
        reservationId: 'res-1',
      });
      expect(prisma.issue.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roomId: 'room-1',
            reservationId: 'res-1',
          }),
        }),
      );
    });

    it('creates a general issue for any unit member', async () => {
      const dto = await service.create(USER, UNIT, {
        message: 'Hallway light is out',
      });
      expect(units.assertMember).toHaveBeenCalledWith(USER, UNIT);
      expect(dto).toMatchObject({
        reporterName: 'Bob Horvath',
        roomName: null,
        status: 'OPEN',
      });
    });
  });

  describe('list', () => {
    it('filters to the caller’s own issues for a MEMBER', async () => {
      units.assertMember.mockResolvedValue('MEMBER');
      await service.list(USER, UNIT);
      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { unitId: UNIT, reporterId: USER } }),
      );
    });

    it('returns every issue in the unit for the OWNER', async () => {
      units.assertMember.mockResolvedValue('OWNER');
      await service.list(OWNER, UNIT);
      expect(prisma.issue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { unitId: UNIT } }),
      );
    });
  });

  describe('resolve', () => {
    it('marks an open issue resolved and stamps resolvedAt', async () => {
      prisma.issue.findUnique.mockResolvedValue(dbIssue());
      prisma.issue.update.mockResolvedValue(
        dbIssue({ status: 'RESOLVED', resolvedAt: new Date() }),
      );
      const dto = await service.resolve(OWNER, UNIT, 'issue-1');
      expect(units.assertOwner).toHaveBeenCalledWith(OWNER, UNIT);
      expect(dto.status).toBe('RESOLVED');
      expect(prisma.issue.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'RESOLVED', resolvedAt: expect.any(Date) },
        }),
      );
    });

    it('404s for an issue from another unit', async () => {
      prisma.issue.findUnique.mockResolvedValue(dbIssue({ unitId: 'other-unit' }));
      await expect(service.resolve(OWNER, UNIT, 'issue-1')).rejects.toThrow(NotFoundException);
    });

    it('rejects resolving twice', async () => {
      prisma.issue.findUnique.mockResolvedValue(dbIssue({ status: 'RESOLVED' }));
      await expect(service.resolve(OWNER, UNIT, 'issue-1')).rejects.toThrow('already resolved');
    });
  });
});
