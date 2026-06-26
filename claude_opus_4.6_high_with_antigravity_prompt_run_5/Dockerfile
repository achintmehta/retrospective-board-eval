FROM node:20-alpine AS builder
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server/index.js"]
