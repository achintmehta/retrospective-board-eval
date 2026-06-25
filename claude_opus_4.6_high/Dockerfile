FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

COPY server/ ./server/

RUN mkdir -p /data

EXPOSE 3001

ENV NODE_ENV=production
ENV DATA_DIR=/data

CMD ["node", "server/index.js"]
