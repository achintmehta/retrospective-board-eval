# Multi-stage build: client → server → runtime
# Node 22.5+ is required for the built-in `node:sqlite` module.
FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:24-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
RUN addgroup -S retro && adduser -S retro -G retro

COPY server/package*.json ./
RUN npm install --omit=dev

COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data
ENV STATIC_DIR=/app/public

RUN mkdir -p /data && chown -R retro:retro /data
VOLUME ["/data"]

USER retro
EXPOSE 4000
CMD ["node", "dist/index.js"]
