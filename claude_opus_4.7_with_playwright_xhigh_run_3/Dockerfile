# --- Stage 1: build the client ---
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Stage 2: install server deps ---
FROM node:22-alpine AS server-deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# --- Stage 3: runtime image ---
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
COPY --from=server-deps /app/node_modules ./node_modules
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/retro.sqlite

EXPOSE 3001
VOLUME ["/data"]

CMD ["node", "server/index.js"]
