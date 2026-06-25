FROM node:20-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm install
RUN cd client && npm install

COPY . .

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /data

EXPOSE 3001

ENV NODE_ENV=production
ENV DATA_DIR=/data

CMD ["node", "server/index.js"]
