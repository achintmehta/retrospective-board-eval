# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install native build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install backend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Install frontend dependencies
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

# Copy source code
COPY tsconfig.json ./
COPY server/ ./server/
COPY client/ ./client/

# Build backend and frontend
RUN npx tsc
RUN cd client && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install native build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy backend built output and dependencies
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/ ./dist/

# Copy frontend built output
COPY --from=builder /app/client/dist/ ./client/dist/

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Volume for persistent SQLite data
VOLUME ["/app/data"]

CMD ["node", "dist/index.js"]
