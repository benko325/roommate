# RoomMate backend (NestJS + Prisma).
# Build from the REPO ROOT so the pnpm workspace lockfile is in context:
#   docker build -f backend/Dockerfile .
#
# Dev dependencies are kept in the final image on purpose: the Prisma CLI is
# needed at deploy time for `prisma migrate deploy` (Render's pre-deploy hook
# and the compose entrypoint both run it). Image size is a non-goal here.

FROM node:22-alpine

# Prisma engines need OpenSSL on musl.
RUN apk add --no-cache openssl
RUN corepack enable

WORKDIR /app

# Install with the workspace manifests only, so this layer caches until
# dependencies actually change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --filter @roommate/backend

COPY backend backend

WORKDIR /app/backend
RUN pnpm prisma:generate && pnpm build

ENV NODE_ENV=production
EXPOSE 3000

# Migrate-on-start is the image default (see docker-start.sh), so Render and
# compose need no command override — avoids platform shell-quoting pitfalls.
CMD ["sh", "docker-start.sh"]
