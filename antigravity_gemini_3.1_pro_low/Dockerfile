FROM node:20-bookworm

WORKDIR /app

# Copy root package.json
COPY package*.json ./
RUN npm install

# Copy client and build
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Copy server code
COPY . .

# Build the backend
RUN npm run build:server

# Force sqlite3 to rebuild from source if there are compatibility issues
RUN apt-get update && apt-get install -y python3 make g++ && npm rebuild sqlite3 --build-from-source

EXPOSE 3000

CMD ["npm", "start"]
