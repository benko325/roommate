import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { HousingUnit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateHousingUnitDto,
  UpdateHousingUnitDto,
} from './dto/housing-unit.dto';

export type ViewerRole = 'OWNER' | 'MEMBER';

function toDto(
  unit: HousingUnit & { _count: { rooms: number; memberships: number } },
  viewerRole: ViewerRole,
) {
  return {
    id: unit.id,
    name: unit.name,
    address: unit.address,
    description: unit.description,
    timezone: unit.timezone,
    ownerId: unit.ownerId,
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
    viewerRole,
    roomCount: unit._count.rooms,
    memberCount: unit._count.memberships,
  };
}

const withCounts = {
  _count: { select: { rooms: true, memberships: true } },
} as const;

@Injectable()
export class HousingUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateHousingUnitDto) {
    const unit = await this.prisma.housingUnit.create({
      data: {
        name: dto.name,
        address: dto.address,
        description: dto.description ?? null,
        timezone: dto.timezone ?? 'UTC',
        ownerId,
      },
      include: withCounts,
    });
    return toDto(unit, 'OWNER');
  }

  /** Units where the user is the owner or a member. */
  async findAllForUser(userId: string) {
    const units = await this.prisma.housingUnit.findMany({
      where: {
        OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
      },
      include: withCounts,
      orderBy: { createdAt: 'desc' },
    });
    return units.map((u) => toDto(u, u.ownerId === userId ? 'OWNER' : 'MEMBER'));
  }

  async findOneForUser(userId: string, id: string) {
    const unit = await this.prisma.housingUnit.findUnique({
      where: { id },
      include: withCounts,
    });
    if (!unit) throw new NotFoundException('Housing unit not found');
    const role = await this.resolveRole(userId, unit.ownerId, id);
    return toDto(unit, role);
  }

  async update(userId: string, id: string, dto: UpdateHousingUnitDto) {
    await this.assertOwner(userId, id);
    const unit = await this.prisma.housingUnit.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
      include: withCounts,
    });
    return toDto(unit, 'OWNER');
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.housingUnit.delete({ where: { id } });
  }

  // ---- Reusable authorization helpers (used by rooms/invitations/reservations) ----

  /** Ensures the user owns the unit; returns it. Throws 404/403 otherwise. */
  async assertOwner(userId: string, unitId: string): Promise<HousingUnit> {
    const unit = await this.prisma.housingUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Housing unit not found');
    if (unit.ownerId !== userId) {
      throw new ForbiddenException('Only the owner can perform this action');
    }
    return unit;
  }

  /** Ensures the user is the owner or a member of the unit; returns their role. */
  async assertMember(userId: string, unitId: string): Promise<ViewerRole> {
    const unit = await this.prisma.housingUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException('Housing unit not found');
    return this.resolveRole(userId, unit.ownerId, unitId);
  }

  private async resolveRole(
    userId: string,
    ownerId: string,
    unitId: string,
  ): Promise<ViewerRole> {
    if (ownerId === userId) return 'OWNER';
    const membership = await this.prisma.unitMembership.findUnique({
      where: { unitId_userId: { unitId, userId } },
    });
    if (!membership) throw new ForbiddenException('You are not a member of this unit');
    return 'MEMBER';
  }
}
