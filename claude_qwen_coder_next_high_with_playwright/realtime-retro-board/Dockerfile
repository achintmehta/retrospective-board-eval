# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make gcc g++ libc-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build the backend TypeScript
RUN npx tsc -p typescript.json

# Build the frontend
RUN cd client && npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

# Create non-root user (using long-form options)
RUN groupadd --system appgroup && \
    useradd --system -g appgroup appuser

# Copy necessary files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/node_modules ./client/node_modules
COPY --from=builder /app/package*.json ./

# Change ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "dist/server.js"]
