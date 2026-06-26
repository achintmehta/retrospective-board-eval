# ---------- Build stage: compile React client ----------
FROM node:24-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---------- Runtime stage: backend serves API + static assets ----------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

COPY package.json package-lock.json* ./
# Skip postinstall since we already built the client in the previous stage.
RUN npm install --omit=dev --ignore-scripts

COPY src ./src
COPY --from=client-build /app/client/dist ./client/dist

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 3001

CMD ["node", "src/index.js"]
