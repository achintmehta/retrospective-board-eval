# Multi-stage build: compile the React client, then bundle it with the Node server.
# The single resulting image runs Express on port 4000, serving both the API,
# WebSocket endpoint, and the static frontend.

FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

# Install build tools needed to compile native sqlite3 bindings, then drop them
# after install to keep the image lean.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
 && true

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund \
 && apk del .build-deps

COPY src ./src
COPY --from=client-build /app/client/dist ./client/dist

RUN mkdir -p /app/data
VOLUME ["/app/data"]

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_FILE=/app/data/retro.sqlite
EXPOSE 4000

CMD ["node", "src/index.js"]
