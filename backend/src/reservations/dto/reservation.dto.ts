import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createReservationSchema = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  note: z.string().max(500).nullish(),
});
export const updateReservationSchema = createReservationSchema.partial();

export class CreateReservationDto extends createZodDto(createReservationSchema) {}
export class UpdateReservationDto extends createZodDto(updateReservationSchema) {}

// Author is present only for the unit owner (privacy rule N-05); tenants see
// anonymized slots plus `isMine` for their own bookings.
const authorSchema = z
  .object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .nullable();

const reservationSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  note: z.string().nullable(),
  status: z.enum(['ACTIVE', 'CANCELLED']),
  isMine: z.boolean(),
  author: authorSchema,
});
export class ReservationDto extends createZodDto(reservationSchema) {}

// Own-reservations list carries room/unit labels for context across units.
const myReservationSchema = reservationSchema.extend({
  roomName: z.string(),
  unitId: z.string().uuid(),
  unitName: z.string(),
});
export class MyReservationDto extends createZodDto(myReservationSchema) {}
