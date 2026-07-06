# Deployment

**Current production (deployed 2026-07-06):**

- Frontend (Vercel): https://roommate-frontend-roan.vercel.app
- API (Render): https://roommate-api.onrender.com — Swagger at `/docs`
- Database: Neon Postgres (connection string lives in Render's `DATABASE_URL`)

Pushes to `main` auto-deploy both Render and Vercel.

Two supported paths:

- **Free hosting** — Neon (Postgres) + Render (API) + Vercel (frontend). No credit card, deploys from GitHub on every push to `main`.
- **Self-hosted** — one machine with Docker: `docker compose up`.

---

## Free hosting (Neon + Render + Vercel)

All three sign-ins work with your GitHub account. Order matters (each step needs a URL from the previous one).

### 1. Neon — database (~2 min)

1. [neon.tech](https://neon.tech) → sign up → create project (name `roommate`, region EU).
2. Copy the **connection string** (Dashboard → Connect, the `postgresql://...sslmode=require` one).

### 2. Render — backend API (~5 min)

1. [render.com](https://render.com) → **New → Blueprint** → connect the GitHub repo. Render reads `render.yaml` and proposes the `roommate-api` service.
2. When prompted for environment variables:
   - `DATABASE_URL` → paste the Neon connection string
   - `FRONTEND_URL` → leave a placeholder for now (you'll get the real URL from Vercel in step 3), e.g. `https://roommate.vercel.app`
   - `JWT_SECRET` is generated automatically
3. Deploy. Pending migrations run automatically before the API starts (the image's default command, `backend/docker-start.sh`, runs `prisma migrate deploy` then boots the app). Your API URL will look like `https://roommate-api-XXXX.onrender.com` — check `<api-url>/docs` renders Swagger.

   > **Gotcha:** don't set a *Docker Command* override on the service (dashboard → Settings). Render executes it without a shell, so anything with `&&` fails with exit 127 — and a value once set via blueprint or dashboard **persists even after removing `dockerCommand` from `render.yaml`**; it must be cleared manually in the dashboard. The image CMD handles everything.
4. Optional (real email): add `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` env vars; without them invitation/reset links are logged to the Render console.

### 3. Vercel — frontend (~3 min)

1. [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
2. Set **Root Directory** to `frontend` (framework preset: Vite — auto-detected).
3. Add env var `VITE_API_URL` = your Render API URL (no trailing slash).
4. Deploy → note the production URL, e.g. `https://roommate-xyz.vercel.app`.

### 4. Close the loop

1. Back in Render → Environment → set `FRONTEND_URL` to the real Vercel URL **without a trailing slash** — CORS compares it byte-for-byte against the browser's `Origin` header (see `backend/src/main.ts`), so `.../` silently fails. This also fixes the links in invitation/reset emails. Save triggers a redeploy.
2. Optionally seed demo data from your machine against Neon:
   ```bash
   DATABASE_URL='<neon-connection-string>' pnpm --filter @roommate/backend db:seed
   ```

**Free-tier caveat:** Render spins the API down after ~15 min of idle; the first request then takes ~30–60 s. Open the app a minute before demoing.

---

## Self-hosted (docker compose)

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

- Frontend: http://localhost:8080 · API/Swagger: http://localhost:3000/docs
- Postgres data persists in the `db-data` volume; migrations apply on every start.
- On a real server, create a `.env` next to `docker-compose.yml` with `JWT_SECRET`, `POSTGRES_PASSWORD`, and your public URLs (`VITE_API_URL`, `FRONTEND_URL`) — see the header comment in `docker-compose.yml`.

Seed demo data (optional):
```bash
docker compose exec backend pnpm exec prisma db seed
```
