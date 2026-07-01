# RoomMate — Roadmap

Where the project stands and what's left. Pick any item below to continue.

## ✅ Done (merged to `main`, PRs #1–#12)

- **Foundation** — pnpm + Turbo monorepo (`backend/` NestJS, `frontend/` Vite/React), Biome, Prisma + PostgreSQL.
- **Data model** — the 5 entities (User, HousingUnit, Room, Reservation, Invitation) + UnitMembership, with CHECK constraints and a partial unique index.
- **Auth** — register / login / `me`, JWT + Passport, role guards, `@CurrentUser`. Swagger at `/docs`; OpenAPI → Kubb typed client on the frontend.
- **Core domain** — households, rooms (with F-11 constraints), invitations + membership, and the **reservation booking engine** (overlap, max length, per-day count, min gap, availability window) with role-based privacy (tenants see anonymized slots, owners see authors).
- **Profile** — edit name/email + change password.
- **Timezones** — per-household IANA timezone; rules and display are timezone-aware.
- **Token refresh** — rotating, revocable refresh tokens; transparent client refresh on 401.
- **Email (SMTP)** — Nodemailer for invitations, with a zero-config log fallback in dev.
- **Password reset** — forgot/reset by emailed single-use token.
- **Admin panel** — system stats + manage users/households/reservations.
- **Seed data** — `pnpm --filter @roommate/backend db:seed` (demo users, password `password123`).

## 🚧 Remaining

### Medium priority
- **#35 Issue reporting to owner** — members report issues (tied to a reservation/room, or general) → owner sees & resolves. New `Issue` entity (unitId, reporterId, optional roomId/reservationId, message, status OPEN/RESOLVED) → module + Zod DTOs → regenerate Kubb client → report form (member) + issues list (owner).
- **#30 Automated tests** — highest-value target is the reservation rule engine (backend unit/e2e); plus frontend component/route tests (Vitest + Testing Library). Replaces the throwaway smoke scripts used during development.
- **#31 CI pipeline** — GitHub Actions: install + lint + check-types + build + tests for backend and frontend on each PR.

### Low priority
- **#32 Deployment** — Dockerfiles for backend/frontend, prod compose/config, migrate-on-deploy, a hosting target.
- **#33 UI polish** — pagination/filtering on long lists (reservations, admin tables), better loading skeletons, a 404 page, optimistic updates.
- **#34 Localization / i18n** — localize all frontend copy + validation messages + dates. Use **Paraglide (inlang)** (message-based, type-safe, Vite plugin), likely SK / EN / CS. Note: backend error messages are English and returned by the API — first pass is frontend-only; later, key them or honor `Accept-Language`.

## Notes / known simplifications
- Reservation times are handled per-household timezone (default UTC). Existing seed rows created before the timezone migration are `UTC` until edited or re-seeded.
- No automated tests yet (only manual smoke tests during development).
- SMTP is optional — without `SMTP_HOST`, invitation/reset links are logged to the backend console.

## Suggested next step
**#30 tests + #31 CI** to lock in everything built so far, or **#35 issue reporting** for another user-facing feature.

## How to run
```bash
pnpm install
cp backend/.env.example backend/.env
pnpm --filter @roommate/backend prisma:migrate
pnpm --filter @roommate/backend db:seed   # optional demo data
pnpm dev                                    # backend :3000, frontend :5173
```
Demo logins (password `password123`): `admin@roommate.dev` (admin), `alice/bob/carol/dave @roommate.dev`.
