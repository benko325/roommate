# RoomMate

A responsive web app for managing shared housing and reserving common rooms
(kitchen, bathroom, laundry, living room) in flats, houses, and dorms. Helps
housemates coordinate use of shared spaces and avoid conflicts.

**Live demo:** [roommate-frontend-roan.vercel.app](https://roommate-frontend-roan.vercel.app) ·
API docs (Swagger): [roommate-api.onrender.com/docs](https://roommate-api.onrender.com/docs)

> Hosted on free tiers — the API spins down when idle, so the first request
> after a while can take ~30–60 s.

## Roles

- **Admin** — full access to all users, units, rooms, invitations, and reservations.
- **Owner** — creates a housing unit, defines its rooms and reservation rules, invites tenants.
- **Tenant** — views room availability and creates/edits/cancels their own reservations.

## Entities

`User` · `HousingUnit` · `Room` · `Reservation` · `Invitation`

## Stack

| Layer     | Technology                                                              |
| --------- | ----------------------------------------------------------------------- |
| Backend   | NestJS 11 · Prisma · PostgreSQL · Zod (nestjs-zod) · Passport-JWT · bcryptjs · @nestjs/swagger |
| Frontend  | React 19 · Vite (SPA) · TanStack Router · TanStack Query · Kubb · shadcn/ui · Tailwind v4 · React Hook Form + Zod · Zustand |
| Tooling   | pnpm · Turbo · Biome · Vitest                                           |

**Type-safety contract:** the backend defines each entity's Zod schema once,
`@nestjs/swagger` emits an OpenAPI spec, and Kubb generates typed TanStack Query
hooks for the frontend — so an API change breaks the frontend at compile time.

## Structure

```
backend/    NestJS API (auth, units, rooms, reservations, invitations)
frontend/   React + Vite web app
```

## Development

Requires Node 20+, pnpm (via `corepack enable pnpm`), and a local PostgreSQL
on port 5432 with a `roommate` role and `roommate` database.

```bash
pnpm install                       # install workspace deps
cp backend/.env.example backend/.env
pnpm --filter @roommate/backend prisma:migrate   # apply DB migrations
pnpm --filter @roommate/backend db:seed          # load demo data (optional)
pnpm dev                           # run backend + frontend
```

### Demo data

`db:seed` resets the database and loads demo households, rooms, members,
an invitation, and reservations. Log in with any of
`alice@roommate.dev`, `bob@roommate.dev`, `carol@roommate.dev`,
`dave@roommate.dev` — password `password123`.

### Tests & CI

```bash
pnpm test                                   # unit tests (Vitest)
pnpm --filter @roommate/backend test:e2e    # backend e2e tests
pnpm lint                                   # Biome
pnpm check-types                            # TypeScript
```

GitHub Actions (`.github/workflows/ci.yml`) runs lint, type-checks, build,
and both test suites on every PR and push to `main`.

## Deployment

Production runs on free tiers: **Vercel** (frontend) + **Render** (API, Docker)
+ **Neon** (Postgres). Every push to `main` auto-deploys. Self-hosting via
`docker compose up` is also supported. See [DEPLOYMENT.md](DEPLOYMENT.md) for
the full walkthrough, environment variables, and known gotchas.
