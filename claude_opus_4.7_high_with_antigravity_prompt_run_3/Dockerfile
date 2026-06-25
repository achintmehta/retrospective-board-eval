FROM node:22-alpine AS client-build
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client ./client
RUN cd client && npm run build

FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/retro.sqlite

RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3001

CMD ["node", "server/index.js"]
