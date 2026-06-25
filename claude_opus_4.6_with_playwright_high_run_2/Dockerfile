FROM node:22-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

COPY server/ ./server/

FROM node:22-alpine

RUN apk add --no-cache libstdc++

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./

RUN mkdir -p /app/data
VOLUME /app/data

EXPOSE 3001

ENV NODE_ENV=production
CMD ["node", "server/index.js"]
