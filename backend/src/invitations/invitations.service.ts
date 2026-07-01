import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Invitation, Prisma } from '@prisma/client';
import { HousingUnitsService } from '../housing-units/housing-units.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

function toDto(inv: Invitation) {
  return {
    id: inv.id,
    unitId: inv.unitId,
    email: inv.email,
    status: inv.status,
    token: inv.token,
    sentAt: inv.sentAt,
    respondedAt: inv.respondedAt,
  };
}

const emailEq = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly units: HousingUnitsService,
    private readonly mail: MailService,
  ) {}

  async invite(userId: string, unitId: string, email: string) {
    const unit = await this.units.assertOwner(userId, unitId);

    // Reject inviting someone who already belongs (owner or existing member).
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.id === unit.ownerId) {
        throw new ConflictException('You already own this unit');
      }
      const member = await this.prisma.unitMembership.findUnique({
        where: { unitId_userId: { unitId, userId: existingUser.id } },
      });
      if (member) throw new ConflictException('That person is already a member');
    }

    const token = randomBytes(32).toString('base64url');
    try {
      const invitation = await this.prisma.invitation.create({
        data: { unitId, email, token, status: 'PENDING' },
      });
      this.mail.sendInvitation(email, unit.name, token);
      return toDto(invitation);
    } catch (err) {
      // ux_invitation_pending: one PENDING invite per (unit, email).
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A pending invitation already exists for this email');
      }
      throw err;
    }
  }

  async list(userId: string, unitId: string) {
    await this.units.assertOwner(userId, unitId);
    const invitations = await this.prisma.invitation.findMany({
      where: { unitId },
      orderBy: { sentAt: 'desc' },
    });
    return invitations.map(toDto);
  }

  async revoke(userId: string, unitId: string, invitationId: string) {
    await this.units.assertOwner(userId, unitId);
    const invitation = await this.prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.unitId !== unitId) {
      throw new NotFoundException('Invitation not found');
    }
    await this.prisma.invitation.delete({ where: { id: invitationId } });
  }

  /** Public: minimal info to render the accept page. */
  async lookup(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { unit: { select: { name: true } } },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    return {
      unitName: invitation.unit.name,
      email: invitation.email,
      status: invitation.status,
    };
  }

  async accept(userId: string, userEmail: string, token: string) {
    const invitation = await this.getPendingForUser(token, userEmail);
    await this.prisma.$transaction([
      this.prisma.unitMembership.upsert({
        where: { unitId_userId: { unitId: invitation.unitId, userId } },
        create: { unitId: invitation.unitId, userId },
        update: {},
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      }),
    ]);
    return { unitId: invitation.unitId };
  }

  async reject(userEmail: string, token: string) {
    const invitation = await this.getPendingForUser(token, userEmail);
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'REJECTED', respondedAt: new Date() },
    });
  }

  async listMembers(userId: string, unitId: string) {
    await this.units.assertMember(userId, unitId);
    const memberships = await this.prisma.unitMembership.findMany({
      where: { unitId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return memberships.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      joinedAt: m.joinedAt,
    }));
  }

  async removeMember(userId: string, unitId: string, memberUserId: string) {
    await this.units.assertOwner(userId, unitId);
    const membership = await this.prisma.unitMembership.findUnique({
      where: { unitId_userId: { unitId, userId: memberUserId } },
    });
    if (!membership) throw new NotFoundException('Member not found');
    await this.prisma.unitMembership.delete({
      where: { unitId_userId: { unitId, userId: memberUserId } },
    });
  }

  /** Loads a PENDING invitation by token and checks it belongs to the caller. */
  private async getPendingForUser(token: string, userEmail: string): Promise<Invitation> {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (!emailEq(invitation.email, userEmail)) {
      throw new ForbiddenException('This invitation was sent to a different email');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is already ${invitation.status.toLowerCase()}`);
    }
    return invitation;
  }
}
