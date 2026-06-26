# ---------- Stage 1: build the React client ----------
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---------- Stage 2: install server deps (pure JS, no native build) ----------
FROM node:24-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/ ./

# ---------- Stage 3: runtime ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    CLIENT_DIST=/app/client/dist \
    DB_PATH=/data/retro.sqlite
RUN mkdir -p /data
COPY --from=server-builder /app/server /app/server
COPY --from=client-builder /app/client/dist /app/client/dist
EXPOSE 4000
VOLUME ["/data"]
CMD ["node", "server/src/index.js"]
