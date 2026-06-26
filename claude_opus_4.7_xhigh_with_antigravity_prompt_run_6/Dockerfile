# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install backend deps (we need them at runtime; better-sqlite3 needs build tools)
RUN apk add --no-cache python3 make g++ sqlite

COPY package.json package-lock.json* ./
RUN npm install --omit=optional --no-audit --no-fund

# Build the frontend
COPY client/package.json client/package-lock.json* ./client/
RUN npm --prefix client install --no-audit --no-fund

COPY . .
RUN npm --prefix client run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime

WORKDIR /app

# Minimal runtime deps for better-sqlite3 prebuilds (libstdc++ is usually present)
RUN apk add --no-cache sqlite-libs

# Copy installed backend deps and built frontend
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "server/index.js"]
