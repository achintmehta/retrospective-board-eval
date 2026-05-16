FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY . .
RUN cd client && npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /data

EXPOSE 3001

ENV NODE_ENV=production
ENV DB_PATH=/data/retro.db

CMD ["node", "server/index.js"]
