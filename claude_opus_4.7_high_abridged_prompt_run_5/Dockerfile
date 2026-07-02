FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm install
RUN npm --prefix client install

COPY server ./server
COPY client ./client

RUN npm --prefix client run build

# ---------- Runtime stage ----------
FROM node:24-alpine AS runtime
WORKDIR /app

RUN addgroup -S retro && adduser -S retro -G retro

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/data && chown -R retro:retro /app

USER retro
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/app/data

EXPOSE 4000
VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
