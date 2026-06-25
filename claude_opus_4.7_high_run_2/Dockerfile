# ---- Build frontend ----
FROM node:24-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

# ---- Build server (pure JS deps, no native compile) ----
FROM node:24-alpine AS server-build
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server

# ---- Final runtime image ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data
RUN mkdir -p /data
COPY --from=server-build /app/node_modules ./node_modules
COPY --from=server-build /app/package*.json ./
COPY --from=server-build /app/server ./server
COPY --from=client-build /app/client/dist ./client/dist
VOLUME ["/data"]
EXPOSE 3001
CMD ["node", "server/index.js"]
