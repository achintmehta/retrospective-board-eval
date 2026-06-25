FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install --production

# Build frontend
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Copy backend source
COPY server.js ./
COPY db.js ./
COPY routes/ ./routes/

# Serve static frontend from backend
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "server.js"]
