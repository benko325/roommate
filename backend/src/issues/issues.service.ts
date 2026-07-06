import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Issue, Reservation, Room, User } from '@prisma/client';
import { HousingUnitsService } from '../housing-units/housing-units.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateIssueDto } from './dto/issue.dto';

type IssueWithContext = Issue & {
  reporter: Pick<User, 'firstName' | 'lastName'>;
  room: Pick<Room, 'name'> | null;
  reservation: Pick<Reservation, 'startAt' | 'endAt'> | null;
};

const withContext = {
  reporter: { select: { firstName: true, lastName: true } },
  room: { select: { name: true } },
  reservation: { select: { startAt: true, endAt: true } },
} as const;

function toDto(issue: IssueWithContext) {
  return {
    id: issue.id,
    unitId: issue.unitId,
    reporterId: issue.reporterId,
    reporterName: `${issue.reporter.firstName} ${issue.reporter.lastName}`,
    roomId: issue.roomId,
    roomName: issue.room?.name ?? null,
    reservationId: issue.reservationId,
    reservationStartAt: issue.reservation?.startAt ?? null,
    reservationEndAt: issue.reservation?.endAt ?? null,
    message: issue.message,
    status: issue.status,
    createdAt: issue.createdAt,
    resolvedAt: issue.resolvedAt,
  };
}

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly units: HousingUnitsService,
  ) {}

  async create(userId: string, unitId: string, dto: CreateIssueDto) {
    await this.units.assertMember(userId, unitId);

    if (dto.roomId) {
      const room = await this.prisma.room.findUnique({
        where: { id: dto.roomId },
      });
      if (!room || room.unitId !== unitId) {
        throw new BadRequestException('Room does not belong to this unit');
      }
    }

    let roomId = dto.roomId ?? null;
    if (dto.reservationId) {
      const reservation = await this.prisma.reservation.findUnique({
        where: { id: dto.reservationId },
        include: { room: { select: { unitId: true } } },
      });
      // Tenants only see anonymized slots (N-05), so an issue may only
      // reference the reporter's own reservation.
      if (!reservation || reservation.room.unitId !== unitId || reservation.userId !== userId) {
        throw new BadRequestException('Reservation does not belong to you in this unit');
      }
      if (roomId && reservation.roomId !== roomId) {
        throw new BadRequestException('Reservation is not in the selected room');
      }
      roomId ??= reservation.roomId;
    }

    const issue = await this.prisma.issue.create({
      data: {
        unitId,
        reporterId: userId,
        roomId,
        reservationId: dto.reservationId ?? null,
        message: dto.message,
      },
      include: withContext,
    });
    return toDto(issue);
  }

  /** Owner sees every issue in the unit; a member sees only their own. */
  async list(userId: string, unitId: string) {
    const role = await this.units.assertMember(userId, unitId);
    const issues = await this.prisma.issue.findMany({
      where: { unitId, ...(role === 'MEMBER' && { reporterId: userId }) },
      include: withContext,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return issues.map(toDto);
  }

  async resolve(userId: string, unitId: string, issueId: string) {
    await this.units.assertOwner(userId, unitId);
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });
    if (!issue || issue.unitId !== unitId) {
      throw new NotFoundException('Issue not found');
    }
    if (issue.status === 'RESOLVED') {
      throw new BadRequestException('Issue is already resolved');
    }
    const updated = await this.prisma.issue.update({
      where: { id: issueId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
      include: withContext,
    });
    return toDto(updated);
  }
}
