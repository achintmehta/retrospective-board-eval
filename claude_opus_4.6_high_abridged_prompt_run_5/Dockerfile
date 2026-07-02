FROM node:20-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm install
RUN cd client && npm install

COPY . .
RUN cd client && npm run build

FROM node:20-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

RUN apk del python3 make g++

COPY server/ ./server/
COPY --from=build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
