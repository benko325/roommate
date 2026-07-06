import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// All demo accounts share this password.
const PASSWORD = 'password123';

/** Time-of-day Date for a Postgres TIME column (1970-01-01 UTC anchor). */
const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

/** A Date at `h:m` UTC, `dayOffset` days from today. */
function at(dayOffset: number, h: number, m = 0): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(h, m, 0, 0);
  return d;
}

async function main() {
  // Wipe existing data (dev only), respecting FK order.
  await prisma.issue.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.unitMembership.deleteMany();
  await prisma.room.deleteMany();
  await prisma.housingUnit.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const mkUser = (firstName: string, lastName: string, email: string, systemRole?: 'ADMIN' | 'USER') =>
    prisma.user.create({
      data: { firstName, lastName, email, passwordHash, ...(systemRole && { systemRole }) },
    });

  await mkUser('Admin', 'User', 'admin@roommate.dev', 'ADMIN');
  const alice = await mkUser('Alice', 'Novak', 'alice@roommate.dev');
  const bob = await mkUser('Bob', 'Horvath', 'bob@roommate.dev');
  const carol = await mkUser('Carol', 'Kovac', 'carol@roommate.dev');
  await mkUser('Dave', 'Toth', 'dave@roommate.dev'); // unaffiliated (has a pending invite)

  // --- Sunny Flat: owned by Alice; Bob and Carol are members ---
  const sunny = await prisma.housingUnit.create({
    data: {
      name: 'Sunny Flat',
      address: '12 Main St, Brno',
      description: 'Third-floor apartment shared by three housemates.',
      timezone: 'Europe/Bratislava',
      ownerId: alice.id,
      memberships: { create: [{ userId: bob.id }, { userId: carol.id }] },
    },
  });

  const bathroom = await prisma.room.create({
    data: {
      unitId: sunny.id,
      name: 'Bathroom',
      description: 'The one everyone fights over in the morning.',
      maxReservationHours: 2,
      maxReservationsPerDay: 3,
      minGapMinutes: 30,
      availableFrom: time('06:00'),
      availableTo: time('23:00'),
    },
  });
  const kitchen = await prisma.room.create({
    data: { unitId: sunny.id, name: 'Kitchen', description: 'Shared cooking space.' },
  });
  const laundry = await prisma.room.create({
    data: {
      unitId: sunny.id,
      name: 'Laundry',
      maxReservationHours: 3,
      maxReservationsPerDay: 1,
    },
  });

  // --- Beach House: owned by Carol; Alice is a member ---
  const beach = await prisma.housingUnit.create({
    data: {
      name: 'Beach House',
      address: '5 Shore Rd, Senec',
      timezone: 'Europe/Bratislava',
      ownerId: carol.id,
      memberships: { create: [{ userId: alice.id }] },
    },
  });
  const hotTub = await prisma.room.create({
    data: {
      unitId: beach.id,
      name: 'Hot Tub',
      maxReservationHours: 1,
      availableFrom: time('06:00'),
      availableTo: time('22:00'),
    },
  });

  // Pending invitation for Dave to join Sunny Flat.
  await prisma.invitation.create({
    data: {
      unitId: sunny.id,
      email: 'dave@roommate.dev',
      token: randomBytes(32).toString('base64url'),
      status: 'PENDING',
    },
  });

  // Non-overlapping reservations that respect each room's rules.
  await prisma.reservation.createMany({
    data: [
      { roomId: bathroom.id, userId: bob.id, startAt: at(0, 8), endAt: at(0, 9), note: 'Shower' },
      { roomId: bathroom.id, userId: carol.id, startAt: at(0, 18), endAt: at(0, 19) },
      { roomId: bathroom.id, userId: bob.id, startAt: at(1, 8), endAt: at(1, 9) },
      { roomId: kitchen.id, userId: alice.id, startAt: at(0, 12), endAt: at(0, 13), note: 'Lunch' },
      { roomId: laundry.id, userId: carol.id, startAt: at(0, 10), endAt: at(0, 13), note: 'Bedding' },
      { roomId: hotTub.id, userId: alice.id, startAt: at(0, 20), endAt: at(0, 21) },
    ],
  });

  // Issues reported to the Sunny Flat owner: one open per-room, one resolved general.
  await prisma.issue.createMany({
    data: [
      {
        unitId: sunny.id,
        reporterId: bob.id,
        roomId: bathroom.id,
        message: 'The shower drain is clogged — water pools up after a few minutes.',
      },
      {
        unitId: sunny.id,
        reporterId: carol.id,
        message: 'Hallway light bulb burned out.',
        status: 'RESOLVED',
        resolvedAt: at(0, 9),
      },
    ],
  });

  const users = await prisma.user.count();
  const units = await prisma.housingUnit.count();
  const rooms = await prisma.room.count();
  const reservations = await prisma.reservation.count();
  // biome-ignore lint/suspicious/noConsole: seed feedback
  console.log(
    `Seeded ${users} users, ${units} households, ${rooms} rooms, ${reservations} reservations.\n` +
      `Log in with admin/alice/bob/carol/dave @roommate.dev — password: ${PASSWORD}`,
  );
}

main()
  .catch((e) => {
    // biome-ignore lint/suspicious/noConsole: seed error output
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
