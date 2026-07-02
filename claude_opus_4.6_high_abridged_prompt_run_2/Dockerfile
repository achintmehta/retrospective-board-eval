FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

COPY . .
RUN cd client && npm run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

VOLUME ["/app/data"]

CMD ["node", "server/index.js"]
