# --- Build stage ---
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY client/package.json client/package-lock.json* client/
RUN npm --prefix client install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY client ./client

RUN npm run build:client && npm run build:server

# --- Runtime stage ---
FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DB_DIR=/data

RUN mkdir -p /data

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 4000
VOLUME ["/data"]

CMD ["node", "dist/index.js"]
