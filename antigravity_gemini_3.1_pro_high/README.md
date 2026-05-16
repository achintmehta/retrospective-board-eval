# Realtime Retro Board

A self-hosted, single-container, real-time retrospective board.

## Running Locally

1. Install dependencies for the backend and frontend:
   ```bash
   npm install
   cd client && npm install
   ```

2. Start the backend:
   ```bash
   npx tsx src/server.ts
   ```

3. Start the frontend:
   ```bash
   cd client && npm run dev
   ```

## Docker Deployment

Build and run using Docker:
```bash
docker build -t retro-board .
docker run -p 3000:3000 -v retro-data:/app/data retro-board
```

The SQLite database is stored in `/app/data/retro.db`.
