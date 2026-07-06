import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * End-to-end coverage of the booking flow against a real Postgres test
 * database: register → household → room (with F-11 rules) → invite/accept →
 * reservations (every rule over HTTP) → privacy (N-05) → issue reporting.
 *
 * The unit's timezone is Europe/Bratislava (UTC+2 on the test date), so
 * wall-clock 10:00 = 08:00Z. All times are on a fixed future date to keep
 * the suite deterministic.
 */

const DAY = '2026-08-10'; // CEST, UTC+2
const utc = (hhmm: string) => `${DAY}T${hhmm}:00.000Z`;

describe('Reservations & issues (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;

  let owner: string; // access tokens
  let bob: string;
  let carol: string;
  let unitId: string;
  let roomId: string;
  let bobFirstReservation: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    http = app.getHttpServer();

    // Clean slate, FK order (user-owned tokens cascade with users).
    const prisma = app.get(PrismaService);
    await prisma.issue.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.invitation.deleteMany();
    await prisma.unitMembership.deleteMany();
    await prisma.room.deleteMany();
    await prisma.housingUnit.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function register(firstName: string, email: string): Promise<string> {
    const res = await request(http)
      .post('/auth/register')
      .send({ firstName, lastName: 'Test', email, password: 'password123' })
      .expect(201);
    return res.body.accessToken as string;
  }

  it('registers the owner and two future members', async () => {
    owner = await register('Alice', 'alice@e2e.test');
    bob = await register('Bob', 'bob@e2e.test');
    carol = await register('Carol', 'carol@e2e.test');
  });

  it('owner creates a household and a rule-constrained room', async () => {
    const unit = await request(http)
      .post('/housing-units')
      .set(auth(owner))
      .send({
        name: 'E2E Flat',
        address: '1 Test St, Brno',
        timezone: 'Europe/Bratislava',
      })
      .expect(201);
    unitId = unit.body.id;

    const room = await request(http)
      .post(`/housing-units/${unitId}/rooms`)
      .set(auth(owner))
      .send({
        name: 'Bathroom',
        maxReservationHours: 2,
        maxReservationsPerDay: 2,
        minGapMinutes: 30,
        availableFrom: '06:00',
        availableTo: '23:00',
      })
      .expect(201);
    roomId = room.body.id;
  });

  it('members join via the invitation flow', async () => {
    for (const [email, token] of [
      ['bob@e2e.test', bob],
      ['carol@e2e.test', carol],
    ] as const) {
      const invite = await request(http)
        .post(`/housing-units/${unitId}/invitations`)
        .set(auth(owner))
        .send({ email })
        .expect(201);
      await request(http)
        .post('/invitations/accept')
        .set(auth(token))
        .send({ token: invite.body.token })
        .expect(200);
    }
  });

  it('a non-member cannot book the room', async () => {
    const outsider = await register('Oscar', 'oscar@e2e.test');
    await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(outsider))
      .send({ startAt: utc('08:00'), endAt: utc('09:00') })
      .expect(403);
  });

  it('bob books 10:00–11:00 local', async () => {
    const res = await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(bob))
      .send({ startAt: utc('08:00'), endAt: utc('09:00') })
      .expect(201);
    bobFirstReservation = res.body.id;
    expect(res.body.isMine).toBe(true);
  });

  it('rejects an overlapping slot from another member (409)', async () => {
    await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(carol))
      .send({ startAt: utc('08:30'), endAt: utc('09:30') })
      .expect(409);
  });

  it('rejects a slot longer than 2h', async () => {
    const res = await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(carol))
      .send({ startAt: utc('10:00'), endAt: utc('12:30') })
      .expect(400);
    expect(res.body.message).toContain('at most 2h');
  });

  it('rejects a slot before the 06:00 opening (local wall clock)', async () => {
    // 04:00–05:00 local = 02:00Z–03:00Z.
    const res = await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(carol))
      .send({ startAt: utc('02:00'), endAt: utc('03:00') })
      .expect(400);
    expect(res.body.message).toContain('from 06:00');
  });

  it('rejects a slot past the 23:00 closing', async () => {
    // 22:30–23:30 local.
    await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(carol))
      .send({ startAt: utc('20:30'), endAt: utc('21:30') })
      .expect(400);
  });

  it('rejects a slot crossing local midnight', async () => {
    await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(carol))
      .send({ startAt: utc('20:00'), endAt: `2026-08-11T00:00:00.000Z` })
      .expect(400);
  });

  it('enforces the 30-minute gap between a member’s own bookings', async () => {
    // 11:15 local starts only 15 min after bob's 10:00–11:00.
    const res = await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(bob))
      .send({ startAt: utc('09:15'), endAt: utc('09:45') })
      .expect(400);
    expect(res.body.message).toContain('30 minutes');
  });

  it('accepts a booking exactly 30 minutes after the previous one', async () => {
    await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(bob))
      .send({ startAt: utc('09:30'), endAt: utc('10:30') })
      .expect(201);
  });

  it('enforces max 2 bookings per member per local day', async () => {
    const res = await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(bob))
      .send({ startAt: utc('12:00'), endAt: utc('13:00') })
      .expect(400);
    expect(res.body.message).toContain('2 reservations per day');
  });

  it('anonymizes other members’ slots for tenants (N-05)', async () => {
    const res = await request(http)
      .get(`/rooms/${roomId}/reservations`)
      .set(auth(carol))
      .expect(200);
    expect(res.body).toHaveLength(2);
    for (const slot of res.body) {
      expect(slot.isMine).toBe(false);
      expect(slot.author).toBeNull();
    }
  });

  it('shows authors to the owner in the unit-wide list', async () => {
    const res = await request(http)
      .get(`/housing-units/${unitId}/reservations`)
      .set(auth(owner))
      .expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].author.firstName).toBe('Bob');
  });

  it('cancelling frees the slot for others', async () => {
    await request(http)
      .post(`/reservations/${bobFirstReservation}/cancel`)
      .set(auth(bob))
      .expect(204);
    await request(http)
      .post(`/rooms/${roomId}/reservations`)
      .set(auth(carol))
      .send({ startAt: utc('08:00'), endAt: utc('09:00') })
      .expect(201);
  });

  describe('issue reporting', () => {
    let issueId: string;

    it('bob reports an issue tied to his reservation', async () => {
      // His remaining active booking (11:30–12:30 local).
      const mine = await request(http).get('/reservations/mine').set(auth(bob)).expect(200);
      const active = mine.body.find((r: { status: string }) => r.status === 'ACTIVE');

      const res = await request(http)
        .post(`/housing-units/${unitId}/issues`)
        .set(auth(bob))
        .send({
          message: 'No hot water during my slot.',
          reservationId: active.id,
        })
        .expect(201);
      issueId = res.body.id;
      expect(res.body.roomName).toBe('Bathroom');
      expect(res.body.status).toBe('OPEN');
    });

    it('another member does not see it; the owner does, with the reporter', async () => {
      const carolView = await request(http)
        .get(`/housing-units/${unitId}/issues`)
        .set(auth(carol))
        .expect(200);
      expect(carolView.body).toHaveLength(0);

      const ownerView = await request(http)
        .get(`/housing-units/${unitId}/issues`)
        .set(auth(owner))
        .expect(200);
      expect(ownerView.body).toHaveLength(1);
      expect(ownerView.body[0].reporterName).toBe('Bob Test');
    });

    it('only the owner can resolve it', async () => {
      await request(http)
        .post(`/housing-units/${unitId}/issues/${issueId}/resolve`)
        .set(auth(bob))
        .expect(403);
      const res = await request(http)
        .post(`/housing-units/${unitId}/issues/${issueId}/resolve`)
        .set(auth(owner))
        .expect(201);
      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.resolvedAt).not.toBeNull();
    });
  });
});
