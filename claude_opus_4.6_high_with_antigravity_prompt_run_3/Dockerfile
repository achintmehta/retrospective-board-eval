FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

COPY server/ ./server/

RUN mkdir -p /app/data

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/index.js"]
