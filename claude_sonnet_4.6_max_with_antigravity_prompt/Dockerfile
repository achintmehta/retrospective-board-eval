FROM node:20-alpine AS builder

WORKDIR /app

# Install backend deps
COPY package*.json ./
RUN npm install --production

# Build frontend
COPY client/package*.json ./client/
RUN npm install --prefix client

COPY client/ ./client/
RUN npm run build --prefix client

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY package.json ./
COPY server.js ./
COPY db.js ./

ENV NODE_ENV=production
ENV PORT=3001

VOLUME ["/app/data"]

EXPOSE 3001

CMD ["node", "server.js"]
