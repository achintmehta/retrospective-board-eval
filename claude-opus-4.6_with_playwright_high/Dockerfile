FROM node:20-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && rm -rf /root/.npm

COPY --from=build /app/client/dist ./client/dist
COPY server/ ./server/

RUN mkdir -p /data
VOLUME /data
ENV DB_PATH=/data/retro.sqlite

EXPOSE 3001

CMD ["node", "server/index.js"]
