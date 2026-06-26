FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/

RUN npm install --no-audit --no-fund \
 && npm install --prefix client --no-audit --no-fund

COPY . .

RUN npm run build --prefix client

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/retro.sqlite

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3001

CMD ["node", "server/index.js"]
