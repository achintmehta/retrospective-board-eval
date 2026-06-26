# --- Stage 1: build frontend ---
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# --- Stage 2: install server deps ---
FROM node:22-alpine AS server-deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# --- Stage 3: runtime ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

COPY --from=server-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "server/index.js"]
