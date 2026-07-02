# --- Stage 1: build the React client ---
FROM node:20-bookworm-slim AS client-build
WORKDIR /app/client

COPY client/package.json client/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY client/ ./
RUN npm run build

# --- Stage 2: production image with backend + built client ---
FROM node:20-bookworm-slim
WORKDIR /app

# Install build tools once, needed for better-sqlite3 native module compile.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV RETRO_DATA_DIR=/data

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3001

CMD ["node", "server/index.js"]
