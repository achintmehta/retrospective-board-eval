# syntax=docker/dockerfile:1.7
# ---------- Build stage ----------
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Install backend dependencies. Skip postinstall so we can install client deps explicitly.
COPY package.json ./
COPY client/package.json client/package.json
RUN npm install --omit=dev --ignore-scripts
RUN npm --prefix client install --ignore-scripts

# Copy sources and build the frontend.
COPY server ./server
COPY client ./client
RUN npm --prefix client run build

# ---------- Runtime stage ----------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DATA_DIR=/data

RUN useradd --system --create-home --uid 10001 retro \
    && mkdir -p /data \
    && chown retro:retro /data

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/package.json ./package.json

USER retro
VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "server/index.js"]
