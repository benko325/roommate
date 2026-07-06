import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createIssueSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1000),
  roomId: z.string().uuid().optional(),
  reservationId: z.string().uuid().optional(),
});
export class CreateIssueDto extends createZodDto(createIssueSchema) {}

// Reporter name is joined from User; room/reservation context is denormalized
// into the DTO so the frontend can render the list without extra requests.
const issueSchema = z.object({
  id: z.string().uuid(),
  unitId: z.string().uuid(),
  reporterId: z.string().uuid(),
  reporterName: z.string(),
  roomId: z.string().uuid().nullable(),
  roomName: z.string().nullable(),
  reservationId: z.string().uuid().nullable(),
  reservationStartAt: z.string().datetime().nullable(),
  reservationEndAt: z.string().datetime().nullable(),
  message: z.string(),
  status: z.enum(['OPEN', 'RESOLVED']),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
});
export class IssueDto extends createZodDto(issueSchema) {}
