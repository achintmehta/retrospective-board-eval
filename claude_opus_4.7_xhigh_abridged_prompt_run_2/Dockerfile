# syntax=docker/dockerfile:1

# ---- Build stage --------------------------------------------------------
# Installs all deps (including dev), builds the client bundle and server dist,
# then prunes the resulting node_modules down to production-only.
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Toolchain for better-sqlite3's prebuild-install fallback (only needed if
# the prebuilt binary isn't available for this platform).
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Manifests first so Docker can cache the dependency layer separately
# from source changes.
COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/

# The root install's `postinstall` script also installs the client deps.
RUN npm install --no-audit --no-fund

# Now source and build both server and client
COPY . .
RUN npm run build

# Shrink node_modules to production-only. `--ignore-scripts` avoids
# re-triggering the `postinstall` hook (which shells into `client/`) and
# preserves the already-built better-sqlite3 native binary.
RUN npm prune --omit=dev --ignore-scripts

# ---- Runtime stage ------------------------------------------------------
# Minimal image: just Node + prod deps + built assets. No compiler toolchain.
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data
WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "server/dist/index.js"]
