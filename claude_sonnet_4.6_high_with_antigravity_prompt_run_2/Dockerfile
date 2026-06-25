FROM node:20-slim AS builder

WORKDIR /app

# Build tools needed to compile better-sqlite3 native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY client/package*.json ./client/
RUN npm ci --prefix client

COPY . .
RUN npm run build --prefix client

FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY package.json server.js db.js ./

VOLUME ["/app/data"]

EXPOSE 3001

ENV NODE_ENV=production
ENV DB_PATH=/app/data/retro.sqlite

CMD ["node", "server.js"]
