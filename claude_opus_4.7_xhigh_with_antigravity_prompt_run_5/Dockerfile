# syntax=docker/dockerfile:1

# ----- Stage 1: build client -----
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ----- Stage 2: backend deps -----
FROM node:22-alpine AS server-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# ----- Stage 3: runtime -----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3001
CMD ["node", "server/index.js"]
