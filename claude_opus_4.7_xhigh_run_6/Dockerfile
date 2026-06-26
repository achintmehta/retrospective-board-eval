# Multi-stage build: compile the React client, then ship a slim server image.

FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts

COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./client/dist

RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/retro.db
ENV CLIENT_DIST=/app/client/dist

EXPOSE 3001

CMD ["node", "server/index.js"]
