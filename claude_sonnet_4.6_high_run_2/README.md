# Retro Board

A self-hosted, real-time retrospective board. Multiple participants can collaborate on the same board simultaneously via WebSockets. Data is stored in SQLite — no external database needed.

## Prerequisites

- Node.js 18+
- npm 9+

## Running locally (development)

```bash
# Install all dependencies
npm install
npm install --prefix client

# Start both backend and frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Running in production (single server)

```bash
# Build the frontend
npm run build

# Start the production server (serves both API and static files on port 3001)
NODE_ENV=production npm start
```

Open http://localhost:3001.

## Docker

```bash
# Build image
docker build -t retro-board .

# Run (data persisted to a named volume)
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

Open http://localhost:3001.

## Usage

1. Open the app and create a board by entering a name.
2. On the board page, enter a display name when prompted.
3. Add columns (e.g., "Went Well", "Needs Improvement", "Action Items").
4. Add cards to columns, drag cards between columns, and comment on cards.
5. Click **Export CSV** to download the board contents as a CSV file.

All changes are reflected in real time for every connected participant.

## Project structure

```
├── src/
│   ├── server.js          Express + Socket.io entry point
│   ├── db.js              SQLite connection and schema initialisation
│   ├── routes/
│   │   └── boards.js      REST API routes
│   └── socket/
│       └── handlers.js    Socket.io event handlers
├── client/                Vite + React frontend
│   └── src/
│       ├── pages/
│       │   ├── MainPage.jsx
│       │   └── BoardPage.jsx
│       └── components/
│           ├── GuestAuthModal.jsx
│           ├── Column.jsx
│           └── Card.jsx
├── data/                  SQLite database file (auto-created)
└── Dockerfile
```
