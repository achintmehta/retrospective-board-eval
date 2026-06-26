# Multi-stage Dockerfile: builds the React client, then serves it from the Node server.

# ---------- Stage 1: Build client ----------
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---------- Stage 2: Server runtime ----------
FROM node:20-alpine AS server
WORKDIR /app

# Native build deps for better-sqlite3
RUN apk add --no-cache python3 make g++ \
  && ln -sf python3 /usr/bin/python

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001
# Persist SQLite file at /data/retro.sqlite when a volume is mounted at /data
ENV RETRO_DB_PATH=/data/retro.sqlite
VOLUME ["/data"]

EXPOSE 3001
CMD ["node", "server/index.js"]
