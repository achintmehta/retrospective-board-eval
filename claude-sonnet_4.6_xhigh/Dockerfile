FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Install and build frontend
COPY client/package*.json ./client/
RUN npm ci --prefix client

COPY . .
RUN npm run build --prefix client

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/server.js"]
