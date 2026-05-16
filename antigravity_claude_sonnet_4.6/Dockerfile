# Stage 1: Build frontend
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:20-slim AS server-builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build:server

# Stage 3: Production
FROM node:20-slim AS production
WORKDIR /app

# Copy backend dependencies (production only)
COPY package*.json ./
RUN npm ci --only=production

# Copy built server
COPY --from=server-builder /app/dist ./dist

# Copy built frontend into where Express will serve it
COPY --from=client-builder /app/client/dist ./client/dist

# Data directory for SQLite
RUN mkdir -p /data

EXPOSE 3001
ENV PORT=3001
ENV DB_PATH=/data/retro.sqlite

CMD ["node", "dist/server.js"]
