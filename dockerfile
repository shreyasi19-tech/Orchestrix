# syntax=docker/dockerfile:1

ARG NODE_VERSION=22

# ---------------------------------------------------------------------------
# Stage 1: install dependencies, build the Vite client, strip dev dependencies
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app

# --ignore-scripts: better-sqlite3 ships prebuilt binaries for linux x64/arm64 (glibc),
# so no compiler toolchain is needed and no install-time scripts run.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Keep only runtime dependencies (drops vitest, tailwind, typescript, ...)
RUN npm prune --omit=dev --ignore-scripts

# ---------------------------------------------------------------------------
# Stage 2: slim runtime image
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    DISABLE_HMR=true

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json tsconfig.json server.ts ./
COPY server ./server
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# SQLite (WAL) state lives here. Mount a volume at /app/data to persist it.
RUN mkdir -p /app/data && chown -R node:node /app/data
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The entrypoint fixes /app/data ownership (Fly/Render mount volumes as root) and then
# drops privileges to the unprivileged "node" user before starting the server.
ENTRYPOINT ["docker-entrypoint.sh"]

# Run node directly (not via the tsx CLI wrapper) so SIGTERM reaches the app and it can
# stop worker threads and flush SQLite before exiting.
CMD ["node", "--import", "tsx", "server.ts"]