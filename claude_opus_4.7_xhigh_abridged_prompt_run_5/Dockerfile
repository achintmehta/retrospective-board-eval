# -------- build stage: install and compile both server and client --------
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Root deps
COPY package.json ./
RUN npm install --no-audit --no-fund

# Client deps
COPY client/package.json ./client/
RUN npm --prefix client install --no-audit --no-fund

# Sources
COPY server ./server
COPY client ./client

# Build both
RUN npm run build

# -------- runtime stage: minimal image --------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/app/data/retro.sqlite
ENV CLIENT_DIR=/app/client/dist

WORKDIR /app

# Runtime deps only (no native compilation needed — node:sqlite is built in)
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Compiled server + built client
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Persistent volume for SQLite
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4000
CMD ["node", "server/dist/index.js"]
