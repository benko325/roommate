# RoomMate frontend (Vite/React static build served by nginx).
# Build from the REPO ROOT:
#   docker build -f frontend/Dockerfile --build-arg VITE_API_URL=http://localhost:3000 .
#
# VITE_API_URL is baked in at build time (Vite inlines import.meta.env),
# so rebuild the image when the API URL changes.

FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/
RUN pnpm install --frozen-lockfile --filter @roommate/frontend

COPY frontend frontend

ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/frontend
RUN pnpm build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
