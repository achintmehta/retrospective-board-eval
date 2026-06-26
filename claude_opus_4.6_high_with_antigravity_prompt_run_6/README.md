# RetroBoard — Real-Time Retrospective Board

A self-hosted, real-time collaborative retrospective board for agile teams. Built with Node.js, React, Socket.io, and SQLite.

## Features

- **Real-time collaboration** — Cards, movements, and comments sync instantly across all clients via WebSockets
- **Drag-and-drop** — Move cards between columns with intuitive drag-and-drop
- **Guest sessions** — Join with just a display name, no sign-up required
- **Configurable columns** — Add custom columns to match your retro format
- **Nested comments** — Discuss individual cards with threaded comments
- **CSV export** — Export board data for offline analysis
- **Single container** — Deploys as a single Docker image with embedded SQLite

## Quick Start

### Prerequisites

- Node.js 18+ and npm

### Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start both backend and frontend
npm run dev
```

The app will be available at `http://localhost:5173` (frontend) with the API on port `3001`.

### Docker

```bash
# Build the image
docker build -t retro-board .

# Run the container
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Access the app at `http://localhost:3001`.

## Project Structure

```
├── server/
│   ├── index.js        # Express server, Socket.io setup, REST API
│   ├── db.js           # SQLite connection and schema
│   └── queries.js      # Database query utilities
├── client/
│   ├── src/
│   │   ├── main.tsx         # React entry point with routing
│   │   ├── index.css        # Global styles and design system
│   │   ├── pages/
│   │   │   ├── HomePage.tsx # Board list and creation
│   │   │   └── BoardPage.tsx# Board view with real-time features
│   │   └── components/
│   │       ├── GuestModal.tsx    # Display name prompt
│   │       └── CommentsPanel.tsx # Slide-out comments panel
│   └── vite.config.ts  # Vite config with API proxy
├── Dockerfile           # Single-container build
└── package.json         # Root package with dev scripts
```
