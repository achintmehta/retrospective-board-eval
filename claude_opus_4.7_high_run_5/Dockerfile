FROM node:20-alpine AS builder

WORKDIR /app

# Install backend deps
COPY package*.json ./
RUN npm install --omit=dev

# Build frontend
COPY client/package*.json ./client/
RUN npm --prefix client install
COPY client ./client
RUN npm --prefix client run build

# Copy server source
COPY server ./server

# ---- Runtime image ----
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

# Copy production artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

# Persist the SQLite database under /data
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3001
CMD ["node", "server/index.js"]
