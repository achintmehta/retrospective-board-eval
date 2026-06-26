# --- Build stage: compile React/Vite client ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# --- Runtime stage: Express server + bundled static client ---
FROM node:20-alpine AS runtime
WORKDIR /app

# Install python and build tools for sqlite3 native build
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev --no-audit --no-fund

COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "server/src/index.js"]
