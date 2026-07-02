# --------- Build stage ---------
FROM node:22-alpine AS build
WORKDIR /app

# Copy manifests first for better layer caching
COPY package*.json ./
COPY client/package*.json client/
COPY tsconfig.json tsconfig.build.json ./
COPY client/tsconfig.json client/vite.config.ts client/index.html client/
RUN npm install --no-audit --no-fund
RUN npm --prefix client install --no-audit --no-fund

# Copy sources and build
COPY src ./src
COPY client/src ./client/src
COPY client/public ./client/public
RUN npm run build

# --------- Runtime stage ---------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

# Only install production deps in the runtime layer
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist

VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "dist/server.js"]
