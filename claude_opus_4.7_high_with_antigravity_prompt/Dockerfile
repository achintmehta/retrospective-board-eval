# Build the React client
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --no-audit --no-fund
COPY client/ .
RUN npm run build

# Build the production server image — node:sqlite ships with Node, no native deps
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV DATA_DIR=/data

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY server ./server
COPY --from=client-builder /app/client/dist ./client/dist

VOLUME ["/data"]
EXPOSE 4000
CMD ["node", "--experimental-sqlite", "server/index.js"]
