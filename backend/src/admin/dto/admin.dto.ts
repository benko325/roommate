import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const updateRoleSchema = z.object({
  systemRole: z.enum(['ADMIN', 'USER']),
});
export class UpdateRoleDto extends createZodDto(updateRoleSchema) {}

const statsSchema = z.object({
  users: z.number().int(),
  housingUnits: z.number().int(),
  rooms: z.number().int(),
  activeReservations: z.number().int(),
  totalReservations: z.number().int(),
  pendingInvitations: z.number().int(),
});
export class AdminStatsDto extends createZodDto(statsSchema) {}

const adminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  systemRole: z.enum(['ADMIN', 'USER']),
  createdAt: z.string().datetime(),
  ownedUnitCount: z.number().int(),
  membershipCount: z.number().int(),
  reservationCount: z.number().int(),
});
export class AdminUserDto extends createZodDto(adminUserSchema) {}

const adminUnitSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  timezone: z.string(),
  createdAt: z.string().datetime(),
  ownerEmail: z.string(),
  roomCount: z.number().int(),
  memberCount: z.number().int(),
});
export class AdminUnitDto extends createZodDto(adminUnitSchema) {}

const adminReservationSchema = z.object({
  id: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  status: z.enum(['ACTIVE', 'CANCELLED']),
  roomName: z.string(),
  unitName: z.string(),
  userEmail: z.string(),
});
export class AdminReservationDto extends createZodDto(adminReservationSchema) {}
