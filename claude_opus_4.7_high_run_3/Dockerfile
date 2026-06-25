# --- Build stage: build the React client ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# --- Runtime stage: install server deps and run ---
FROM node:20-alpine AS runtime
WORKDIR /app

# Native build deps for better-sqlite3
RUN apk add --no-cache python3 make g++ \
    && ln -sf /usr/bin/python3 /usr/bin/python

# Install server dependencies (skip client postinstall in container by overriding script)
COPY package*.json ./
RUN npm pkg delete scripts.postinstall \
    && npm install --omit=dev

# Copy server source and built client
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

# Drop native build deps after install
RUN apk del python3 make g++

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/retro.sqlite

VOLUME ["/data"]
EXPOSE 3001

CMD ["node", "server/index.js"]
