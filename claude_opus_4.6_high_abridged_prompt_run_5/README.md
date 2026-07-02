# RetroBoard

A real-time retrospective board for team collaboration. Built with React, Express, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards with configurable columns
- Add cards to columns and drag-and-drop them between columns
- Real-time synchronization across all connected clients via WebSockets
- Nested comments on cards with live updates
- Guest authentication via display name
- Export board data to CSV
- Single-container Docker deployment with SQLite persistence

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the backend on `http://localhost:3001` and the frontend on `http://localhost:5173`.

### Production

```bash
npm start
```

Builds the frontend and serves everything from `http://localhost:3001`.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Access the app at `http://localhost:3001`. Board data persists in the `retro-data` volume.

## Project Structure

```
├── server/
│   ├── index.js          # Express server, REST API, Socket.io handlers
│   └── db.js             # SQLite database setup and queries
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx   # Board listing and creation
│   │   │   └── BoardPage.jsx  # Board view with columns, cards, drag-drop
│   │   ├── components/
│   │   │   ├── GuestModal.jsx    # Display name entry
│   │   │   └── CommentPanel.jsx  # Card comment slide-out panel
│   │   ├── App.jsx        # Router setup
│   │   └── main.jsx       # Entry point
│   └── vite.config.js     # Vite config with API proxy
├── Dockerfile             # Multi-stage build for single-container deploy
└── package.json
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DB_PATH` | `./data/retro.db` | SQLite database file path |
| `NODE_ENV` | - | Set to `production` to serve static frontend |
