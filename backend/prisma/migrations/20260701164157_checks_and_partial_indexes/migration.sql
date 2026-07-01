-- Data-integrity constraints and a partial index that the Prisma schema
-- cannot express declaratively. See Projekt/cast4 §3.3–3.4.

-- ROOM: reservation-rule bounds (F-11). NULL means "no limit set".
ALTER TABLE "rooms"
  ADD CONSTRAINT "rooms_max_reservation_hours_check"
    CHECK ("max_reservation_hours" IS NULL OR "max_reservation_hours" > 0),
  ADD CONSTRAINT "rooms_max_reservations_per_day_check"
    CHECK ("max_reservations_per_day" IS NULL OR "max_reservations_per_day" > 0),
  ADD CONSTRAINT "rooms_min_gap_minutes_check"
    CHECK ("min_gap_minutes" IS NULL OR "min_gap_minutes" >= 0),
  ADD CONSTRAINT "rooms_available_window_check"
    CHECK ("available_from" IS NULL OR "available_to" IS NULL OR "available_to" > "available_from");

-- RESERVATION: a reservation must end after it starts.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_time_range_check" CHECK ("end_at" > "start_at");

-- INVITATION: at most one PENDING invitation per (unit, email). Expired/answered
-- invitations do not block re-inviting the same person.
CREATE UNIQUE INDEX "ux_invitation_pending"
  ON "invitations" ("unit_id", "email")
  WHERE "status" = 'PENDING';
