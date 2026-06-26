FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DB_PATH=/data/retro.db

COPY --from=server-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 4000
CMD ["node", "server/index.js"]
