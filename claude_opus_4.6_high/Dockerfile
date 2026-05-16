FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build && rm -rf node_modules

COPY server/ ./server/

RUN apk del python3 make g++

EXPOSE 3001

RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/retro.sqlite

VOLUME /data

CMD ["node", "server/index.js"]
