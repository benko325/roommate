import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createHousingUnitSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().min(1, 'Address is required').max(200),
  description: z.string().max(2000).nullish(),
});

// All fields optional on update; at least the shape is reused.
export const updateHousingUnitSchema = createHousingUnitSchema.partial();

export class CreateHousingUnitDto extends createZodDto(createHousingUnitSchema) {}
export class UpdateHousingUnitDto extends createZodDto(updateHousingUnitSchema) {}

// Response shape for OpenAPI docs.
const housingUnitSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  description: z.string().nullable(),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  // Derived: caller's relationship + simple counts for the overview screen.
  viewerRole: z.enum(['OWNER', 'MEMBER']),
  roomCount: z.number().int(),
  memberCount: z.number().int(),
});

export class HousingUnitDto extends createZodDto(housingUnitSchema) {}
