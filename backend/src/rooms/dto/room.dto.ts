import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// "HH:MM" 24-hour time.
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (00:00–23:59)');

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(2000).nullish(),
  maxReservationHours: z.number().int().positive().nullish(),
  maxReservationsPerDay: z.number().int().positive().nullish(),
  minGapMinutes: z.number().int().nonnegative().nullish(),
  availableFrom: timeString.nullish(),
  availableTo: timeString.nullish(),
});

export const updateRoomSchema = createRoomSchema.partial();

export class CreateRoomDto extends createZodDto(createRoomSchema) {}
export class UpdateRoomDto extends createZodDto(updateRoomSchema) {}

const roomSchema = z.object({
  id: z.string().uuid(),
  unitId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  maxReservationHours: z.number().int().nullable(),
  maxReservationsPerDay: z.number().int().nullable(),
  minGapMinutes: z.number().int().nullable(),
  availableFrom: z.string().nullable(),
  availableTo: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export class RoomDto extends createZodDto(roomSchema) {}
