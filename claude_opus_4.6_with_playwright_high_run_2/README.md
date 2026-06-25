# Retrospective Board

A real-time retrospective board for team collaboration, built with React, Express, Socket.io, and SQLite.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Real-time card creation and movement via WebSockets
- Drag-and-drop cards between columns
- Nested comments on cards
- Guest authentication with display names
- Export board data to CSV
- Single-container Docker deployment

## Quick Start

### Prerequisites

- Node.js 20+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts both the backend (port 3001) and the Vite dev server (port 5173). Open http://localhost:5173.

### Production

```bash
npm run build
npm start
```

The server runs on port 3001, serving both the API and the built frontend.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Open http://localhost:3001.

## Project Structure

```
├── server/
│   ├── index.js       # Express + Socket.io server
│   ├── db.js          # SQLite connection
│   ├── schema.js      # Database schema initialization
│   ├── queries.js     # Database query functions
│   ├── routes.js      # REST API routes
│   └── socket.js      # Socket.io event handlers
├── client/
│   └── src/
│       ├── pages/
│       │   ├── HomePage.jsx   # Board listing and creation
│       │   └── BoardPage.jsx  # Board view with real-time collaboration
│       └── components/
│           ├── Column.jsx          # Board column with drag-and-drop
│           ├── Card.jsx            # Card display
│           ├── CommentsModal.jsx   # Comment viewing and creation
│           └── GuestAuthModal.jsx  # Display name entry
├── Dockerfile
└── package.json
```
