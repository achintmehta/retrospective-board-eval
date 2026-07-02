FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY package*.json ./
COPY server/ ./server/

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "server/index.js"]
