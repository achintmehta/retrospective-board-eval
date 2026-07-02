# --- Stage 1: build the React client ---
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# --- Stage 2: install server deps ---
FROM node:20-alpine AS server-builder
WORKDIR /app
COPY package.json package-lock.json* ./
# sqlite3 needs build tools on alpine
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm install --omit=dev --no-audit --no-fund \
    && apk del .build-deps

# --- Stage 3: runtime ---
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

COPY --from=server-builder /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY --from=client-builder /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 4000
CMD ["node", "server/index.js"]
