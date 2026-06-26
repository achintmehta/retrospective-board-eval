# --- Build stage: install deps and build client ---
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/

# Install all dependencies (root + client via postinstall)
RUN npm install --no-audit --no-fund

# Copy sources and build the client
COPY . .
RUN npm --prefix client run build

# --- Runtime stage: lean image with only what we need ---
FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data

# Copy production deps and built artifacts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

# Persist SQLite data under /data (mount a volume to keep it across restarts)
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3001
CMD ["node", "server/index.js"]
