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
- **Issue reporting (#35)** — members report issues (general, per-room, or tied to their own reservation) → owner sees & resolves. `Issue` entity + `/housing-units/:unitId/issues` endpoints, Issues tab on the unit page, "Report issue" on My Reservations.
- **Seed data** — `pnpm --filter @roommate/backend db:seed` (demo users, password `password123`).
- **Tests (#30)** — backend unit tests (reservation rule engine incl. timezones/DST, issues authorization) + e2e suite over HTTP against a `roommate_test` database (`test:e2e`), frontend Vitest + Testing Library (time helpers, report-issue dialog).
- **CI (#31)** — GitHub Actions on each PR/push to main: install → prisma generate → lint → check-types → build → unit tests → e2e (with a Postgres service).
- **Deployment (#32)** — Dockerfiles for backend/frontend, `docker compose up` self-hosting with migrate-on-start, and free hosting on Neon + Render + Vercel (`render.yaml`, `vercel.json`). See `DEPLOYMENT.md`.

## 🚧 Remaining

### Low priority
- **#33 UI polish** — pagination/filtering on long lists (reservations, admin tables), better loading skeletons, a 404 page, optimistic updates.
- **#34 Localization / i18n** — localize all frontend copy + validation messages + dates. Use **Paraglide (inlang)** (message-based, type-safe, Vite plugin), likely SK / EN / CS. Note: backend error messages are English and returned by the API — first pass is frontend-only; later, key them or honor `Accept-Language`.

## Notes / known simplifications
- Reservation times are handled per-household timezone (default UTC). Existing seed rows created before the timezone migration are `UTC` until edited or re-seeded.
- SMTP is optional — without `SMTP_HOST`, invitation/reset links are logged to the backend console.

## Suggested next step
**#33 UI polish** for a rounder demo, or **#34 localization** if a Slovak UI matters for the presentation.

## How to run
```bash
pnpm install
cp backend/.env.example backend/.env
pnpm --filter @roommate/backend prisma:migrate
pnpm --filter @roommate/backend db:seed   # optional demo data
pnpm dev                                    # backend :3000, frontend :5173
```
Demo logins (password `password123`): `admin@roommate.dev` (admin), `alice/bob/carol/dave @roommate.dev`.
