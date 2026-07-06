#!/bin/sh
# Container entrypoint: apply pending migrations, then start the API.
set -e
pnpm exec prisma migrate deploy
exec node dist/main.js
