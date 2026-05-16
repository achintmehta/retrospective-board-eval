FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Build client
COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Build server
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Final stage
FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN apt-get update && apt-get install -y python3 make g++ && \
    npm ci --omit=dev --build-from-source=sqlite3 && \
    apt-get remove -y python3 make g++ && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# Ensure data directory exists for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV DB_PATH=/app/data/retro.db

EXPOSE 3000

CMD ["node", "dist/server.js"]
