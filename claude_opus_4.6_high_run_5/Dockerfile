FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "server/index.js"]
