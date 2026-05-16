# ---- Stage 1: Build the React/Vite client ----
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---- Stage 2: Install backend dependencies ----
# Backend uses node:sqlite (built-in) — no native compilation needed.
FROM node:22-alpine AS server-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

# ---- Stage 3: Final runtime image ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DATA_DIR=/app/data

# Bring in backend node_modules and source
COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server

# Bring in built static frontend
COPY --from=client-build /app/client/dist ./client/dist

# Persistent data volume for the SQLite database
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4000
CMD ["node", "server/index.js"]
