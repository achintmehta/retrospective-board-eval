# --- Build stage ---
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json server/
COPY client/package.json client/

RUN npm install --no-audit --no-fund

COPY server ./server
COPY client ./client

RUN npm run build

# --- Runtime stage ---
FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data
ENV CLIENT_DIR=/app/client/dist

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/package.json ./client/package.json
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3001

CMD ["node", "server/dist/index.js"]
