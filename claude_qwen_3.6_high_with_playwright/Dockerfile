FROM node:20-alpine

WORKDIR /app

# Install all dependencies (dev needed for build)
COPY package*.json ./
RUN npm ci

# Build frontend
COPY vite.config.js ./
COPY client/ ./client/
RUN npx vite build

# Remove dev dependencies
RUN npm prune --production

# Copy server files
COPY server.js ./
COPY db/ ./db/
COPY routes/ ./routes/

RUN apk add --no-cache dumb-init

EXPOSE 3001

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
