# Retro Board

A real-time collaborative retrospective board built with Node.js, Express, Socket.io, SQLite, and React.

## Features

- Create retrospective boards with configurable columns
- Real-time card management (add, move via drag-and-drop)
- Nested comments on cards
- Guest authentication with display names
- Export board data to CSV
- Single-container Docker deployment with SQLite

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Run in Development

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Start both backend and frontend dev servers
npm run dev
```

The backend runs on `http://localhost:3000` and the Vite dev server on `http://localhost:5173`.
Open `http://localhost:5173` in your browser.

### Run in Production

```bash
# Build the frontend
cd client && npm run build && cd ..

# Start the production server (serves both API and static files)
npm start
```

Open `http://localhost:3000` in your browser.

### Docker

```bash
# Build the image
docker build -t retro-board .

# Run the container (data persists via volume)
docker run -p 3000:3000 -v retro-data:/app/data retro-board
```

Open `http://localhost:3000` in your browser.

## API Documentation

See [API.md](API.md) for full REST API reference.

## Architecture

- **Backend:** Node.js + Express + Socket.io
- **Database:** SQLite (file at `data/retro.db`)
- **Frontend:** React + Vite + React Router + @hello-pangea/dnd
- **Real-time:** Socket.io rooms per board

## Project Structure

```
├── src/
│   ├── index.js        # Express server entry point
│   ├── db.js           # SQLite connection and schema
│   ├── queries.js      # Database utility functions
│   ├── socket.js       # Socket.io event handlers
│   └── routes/
│       └── boards.js   # REST API routes
├── client/
│   └── src/
│       ├── pages/
│       │   ├── MainPage.jsx   # Board list and creation
│       │   └── BoardPage.jsx  # Board with real-time collaboration
│       └── components/
│           ├── Column.jsx
│           ├── CardItem.jsx
│           ├── CommentModal.jsx
│           └── GuestAuthModal.jsx
├── data/               # SQLite database (auto-created)
├── Dockerfile
└── package.json
```
