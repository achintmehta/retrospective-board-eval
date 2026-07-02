# --- Stage 1: build client ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# --- Stage 2: install server deps ---
FROM node:20-alpine AS server-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
# Skip the postinstall (client install) since we already built the client in stage 1
RUN npm pkg delete scripts.postinstall && npm ci --omit=dev --no-audit --no-fund

# --- Stage 3: runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

COPY --from=server-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3001

CMD ["node", "server/index.js"]
