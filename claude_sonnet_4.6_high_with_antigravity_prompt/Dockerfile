FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
RUN apk del python3 make g++
COPY server.js ./
COPY src/ ./src/
COPY --from=client-builder /app/client/dist ./client/dist

EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "server.js"]
