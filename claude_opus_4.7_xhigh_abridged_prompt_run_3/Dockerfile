# syntax=docker/dockerfile:1.7

# Stage 1: build the client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# Stage 2: install server production deps
FROM node:20-alpine AS server-deps
WORKDIR /app
# python + build tools are needed if better-sqlite3 has no prebuilt for the arch
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Stage 3: runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
USER node
VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server/index.js"]
