# Multi-stage build: build client, then run node server serving static assets.

FROM node:22-alpine AS client-build
WORKDIR /app
COPY client/package.json client/package-lock.json* ./client/
RUN cd client && npm install --no-audit --no-fund
COPY client ./client
RUN cd client && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY package.json package-lock.json* ./
# --ignore-scripts skips the root postinstall that installs client dev deps —
# the client is already built and copied in from the client-build stage below.
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist
VOLUME ["/app/data"]
EXPOSE 4000
CMD ["node", "server/index.js"]
