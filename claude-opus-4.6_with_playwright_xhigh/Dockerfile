FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm install --production
RUN cd client && npm install

COPY . .

RUN cd client && npm run build

RUN mkdir -p /data

EXPOSE 3000

ENV NODE_ENV=production
ENV DATA_DIR=/data

CMD ["node", "server/index.js"]
