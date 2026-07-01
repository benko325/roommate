import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
});
export const tokenSchema = z.object({ token: z.string().min(1).max(64) });

export class CreateInvitationDto extends createZodDto(createInvitationSchema) {}
export class TokenDto extends createZodDto(tokenSchema) {}

const invitationSchema = z.object({
  id: z.string().uuid(),
  unitId: z.string().uuid(),
  email: z.string(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  token: z.string(),
  sentAt: z.string().datetime(),
  respondedAt: z.string().datetime().nullable(),
});
export class InvitationDto extends createZodDto(invitationSchema) {}

// Public token lookup — no token echoed back, minimal info for the accept page.
const invitationLookupSchema = z.object({
  unitName: z.string(),
  email: z.string(),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
});
export class InvitationLookupDto extends createZodDto(invitationLookupSchema) {}

const memberSchema = z.object({
  userId: z.string().uuid(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  joinedAt: z.string().datetime(),
});
export class MemberDto extends createZodDto(memberSchema) {}
