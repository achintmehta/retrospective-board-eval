# --- Stage 1: build the React client ---
FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# --- Stage 2: install backend deps ---
FROM node:24-alpine AS server-build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

# --- Stage 3: runtime ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data
RUN mkdir -p /data
COPY --from=server-build /app/node_modules ./node_modules
COPY package.json ./
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
EXPOSE 3001
VOLUME ["/data"]
CMD ["node", "server/index.js"]
