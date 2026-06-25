# syntax=docker/dockerfile:1
# ---------- Stage 1: build client ----------
FROM node:20-bullseye-slim AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---------- Stage 2: install backend deps ----------
FROM node:20-bullseye-slim AS server-deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json ./
# --ignore-scripts skips the package.json postinstall (which would npm install
# the client). `npm rebuild better-sqlite3` then runs that module's install
# script to fetch its prebuilt native binary for this Node/Linux/arch.
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts \
 && npm rebuild better-sqlite3 --no-audit --no-fund

# ---------- Stage 3: runtime ----------
FROM node:20-bullseye-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    RETRO_DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json server.js ./
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist
VOLUME ["/data"]
EXPOSE 4000
USER node
CMD ["node", "server.js"]
