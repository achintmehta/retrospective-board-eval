# Multi-stage Dockerfile: build the React client, then bundle the Node server
# and the static client assets into a single self-contained image.

# Stage 1 — build the React client
FROM node:24-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2 — install server deps (pure JS, no native build needed)
FROM node:24-bookworm-slim AS server-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# Stage 3 — minimal runtime image
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data
WORKDIR /app
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

# Persistent SQLite volume.
VOLUME ["/data"]
EXPOSE 3001
CMD ["node", "server/index.js"]
