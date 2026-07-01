# RoomMate

A responsive web app for managing shared housing and reserving common rooms
(kitchen, bathroom, laundry, living room) in flats, houses, and dorms. Helps
housemates coordinate use of shared spaces and avoid conflicts.

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

Requires Node 20+ and pnpm (via `corepack enable pnpm`).

```bash
pnpm install     # install workspace deps
pnpm dev         # run backend + frontend
```

> Scaffolding in progress — the backend and frontend apps are added in the first milestone.
