# Multi-stage build: compile TypeScript backend + Vite client, then ship
# them together in a single Node runtime image. SQLite data lives in /data
# so it can be persisted via a Docker volume.

FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install build tooling for sqlite3 native bindings.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY client/package.json ./client/
RUN npm install --no-audit --no-fund \
    && npm --prefix client install --no-audit --no-fund

COPY tsconfig*.json ./
COPY server ./server
COPY client ./client

RUN npm run build

# Prune dev dependencies for the runtime image.
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/package.json ./

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
