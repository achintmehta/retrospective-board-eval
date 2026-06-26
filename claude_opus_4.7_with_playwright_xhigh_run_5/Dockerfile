# Multi-stage Dockerfile: build the React client, then run the Node server
# that serves both the API/Socket.io and the static client bundle.

FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:22-alpine AS server
WORKDIR /app

# node:sqlite is shipped with Node — no native build step required.
COPY package*.json ./
RUN npm install --omit=dev

COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

# Persistent volume for the SQLite database file
VOLUME ["/app/data"]
ENV DATA_DIR=/app/data
ENV PORT=4000
ENV NODE_ENV=production
ENV SERVE_CLIENT=true

EXPOSE 4000
CMD ["node", "server/index.js"]
