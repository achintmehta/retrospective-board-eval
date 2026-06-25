FROM node:22-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

COPY . .
RUN cd client && npm run build

FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server ./server

RUN mkdir -p /data

EXPOSE 3001

ENV NODE_ENV=production
ENV DB_PATH=/data/retro.sqlite
CMD ["node", "server/index.js"]
