# syntax=docker/dockerfile:1.6

# ---- Build the React client ----
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---- Install server production deps (pure JS — no native build needed) ----
FROM node:24-alpine AS server-builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY server/ ./server/

# ---- Final runtime image ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DATA_DIR=/data \
    CLIENT_DIST=/app/client/dist
RUN mkdir -p /data \
    && addgroup -S app && adduser -S app -G app \
    && chown -R app:app /data
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/package.json ./package.json
COPY --from=server-builder /app/server ./server
COPY --from=client-builder /app/client/dist ./client/dist
USER app
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server/index.js"]
