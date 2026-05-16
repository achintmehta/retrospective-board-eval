# Stage 1: Build the frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the backend and serve frontend
FROM node:20-slim
WORKDIR /app

# Install build tools for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./server/
RUN cd server && npm install --production --build-from-source

COPY server/ ./server/
RUN mkdir -p /app/server/data

COPY --from=frontend-build /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server/index.js"]
