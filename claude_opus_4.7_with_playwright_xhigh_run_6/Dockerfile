FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY client/package.json client/package-lock.json* ./client/

RUN npm install --include=dev

COPY tsconfig.json ./
COPY server ./server
COPY client ./client

RUN npm run build


FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "dist/index.js"]
