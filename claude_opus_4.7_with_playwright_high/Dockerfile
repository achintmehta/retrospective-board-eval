# Multi-stage build: build the client, then run the server which serves the static client and API.
# Requires Node >= 22.5 (server uses the built-in node:sqlite module).
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY client/package*.json ./client/
RUN npm --prefix client install

COPY . .
RUN npm --prefix client run build

# Runtime stage
FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 3001

CMD ["node", "server/index.js"]
