# ---------- Stage 1: Build the React client ----------
FROM node:22-bookworm-slim AS client-build
WORKDIR /app/client

COPY client/package.json client/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY client/ ./
RUN npm run build

# ---------- Stage 2: Install backend dependencies ----------
FROM node:22-bookworm-slim AS server-build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# ---------- Stage 3: Runtime ----------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data
WORKDIR /app

COPY --from=server-build /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY --from=client-build /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 4000
CMD ["node", "server.js"]
