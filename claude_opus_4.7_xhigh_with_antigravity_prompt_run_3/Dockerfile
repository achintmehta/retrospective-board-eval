# NOTE: Node 24 is required because the server uses `node:sqlite`, which is
# only stable (no experimental flag) on Node 23+. On Node 20 the runtime
# throws ERR_UNKNOWN_BUILTIN_MODULE. We have no native modules left in the
# tree, so we don't need build-essentials anywhere — pure JS deps only.

# --- Stage 1: build the React client ------------------------------------------
FROM node:24-alpine AS client-build
WORKDIR /app
COPY client/package*.json client/
RUN cd client && npm ci --no-audit --no-fund
COPY client/ client/
RUN cd client && npm run build

# --- Stage 2: install production server deps ---------------------------------
FROM node:24-alpine AS server-deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Skip the postinstall hook (which would try to install the client deps too) —
# the client was already built in stage 1, and we only need server deps here.
RUN npm pkg delete scripts.postinstall \
    && npm ci --omit=dev --no-audit --no-fund

# --- Stage 3: lean runtime image ---------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    RETRO_DATA_DIR=/data
COPY package.json ./
COPY --from=server-deps /app/node_modules ./node_modules
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

# Persist SQLite across container restarts via a volume mount.
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server/index.js"]
