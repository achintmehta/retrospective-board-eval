# --- Stage 1: build the React client ----------------------------------------
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: install server dependencies ------------------------------------
FROM node:20-alpine AS server-deps
WORKDIR /app
# build tools for better-sqlite3 native module
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install --omit=dev

# --- Stage 3: final runtime image --------------------------------------------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DB_PATH=/app/data/retro.sqlite

COPY --from=server-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server ./server
COPY --from=client-builder /app/client/dist ./client/dist

# Persist SQLite data via a mounted volume.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4000
CMD ["node", "server/index.js"]
