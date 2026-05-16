# Realtime Retrospective Board

A self-hosted, realtime retrospective board built with Node.js, Express, React, Vite, Socket.io, and SQLite.

## Prerequisites
- Node.js v18+ 
- npm

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ..
   ```

2. Start the development server (runs both backend and frontend):
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:5173` (Vite's default port, or whichever port it outputs).

## Running via Docker

1. Build the image:
   ```bash
   docker build -t retro-board .
   ```

2. Run the container (Linux/macOS):
   ```bash
   docker run -p 3000:3000 -v $(pwd)/data:/app/data retro-board
   ```
   *Note: If you are using Windows PowerShell, use `${PWD}/data` instead of `$(pwd)/data`. If using Command Prompt, use `%cd%/data`.*

3. Open your browser to `http://localhost:3000`.

## Architecture
- **Backend:** Node.js, Express, Socket.io, SQLite
- **Frontend:** React, Vite, Socket.io Client, @hello-pangea/dnd

For more information, see:
- [API Documentation](./docs/API.md)
- [Frontend Documentation](./docs/FRONTEND.md)
