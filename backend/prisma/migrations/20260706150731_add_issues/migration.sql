-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "issues" (
    "id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "room_id" UUID,
    "reservation_id" UUID,
    "message" VARCHAR(1000) NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ix_issue_unit_status" ON "issues"("unit_id", "status");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "housing_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
