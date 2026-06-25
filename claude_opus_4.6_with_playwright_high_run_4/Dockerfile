FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY client/package.json ./client/
RUN cd client && npm install

COPY . .
RUN cd client && npm run build

RUN apk del python3 make g++

EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "server/index.js"]
