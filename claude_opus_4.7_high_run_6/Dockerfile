# Multi-stage build: compile the client, then ship a slim production image
# that serves both the API and the static React bundle from a single container.
# Node 22+ is required for the built-in `node:sqlite` module.

# ---------- Stage 1: build the client ----------
FROM node:22-bookworm-slim AS client-build
WORKDIR /app

COPY client/package.json client/
RUN npm --prefix client install

COPY client/ client/
RUN npm --prefix client run build


# ---------- Stage 2: install production server dependencies ----------
FROM node:22-bookworm-slim AS server-deps
WORKDIR /app

COPY package.json ./
# Skip the postinstall hook (which would re-install client deps) here
RUN npm install --omit=dev --ignore-scripts


# ---------- Stage 3: runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/app/data

COPY --from=server-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3001
CMD ["node", "server/index.js"]
