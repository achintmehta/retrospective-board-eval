# --- Build stage: compile the React client and prepare backend deps ---
FROM node:22-alpine AS build

WORKDIR /app

# Backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Frontend dependencies + build
COPY client/package*.json ./client/
RUN npm --prefix client install
COPY client ./client
RUN npm --prefix client run build

# Backend source
COPY src ./src

# --- Runtime stage: only what is needed to serve the app ---
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/retro.sqlite

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3001

CMD ["node", "--experimental-sqlite", "src/server.js"]
