FROM node:24-slim AS builder

# Build tools needed to compile better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend deps (npm install so it picks up optionalDependencies on Linux)
COPY package*.json ./
RUN npm install --omit=dev

# Install and build frontend
COPY client/package*.json ./client/
RUN cd client && npm install

COPY . .
RUN cd client && npm run build

# Production image — copy pre-compiled node_modules from builder, no rebuild needed
FROM node:24-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY src ./src
COPY package.json ./

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/data/retro.db

EXPOSE 3000

CMD ["node", "src/index.js"]
