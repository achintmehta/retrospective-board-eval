# Multi-stage build: build client, then run server which serves static assets.
FROM node:20-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client ./
RUN npm run build

FROM node:20-bookworm-slim AS server-deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/retro.sqlite
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3001
CMD ["node", "server/index.js"]
