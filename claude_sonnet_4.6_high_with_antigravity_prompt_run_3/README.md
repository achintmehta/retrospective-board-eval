# RetroBoard

A real-time collaborative retrospective board. Create boards, add cards, drag-and-drop, comment, and export — all in one place. No accounts needed.

## Features

- Real-time collaboration via WebSockets (Socket.io)
- Guest authentication (just enter a display name)
- Drag-and-drop card movement between columns
- Nested comments on cards
- CSV export of board data
- SQLite persistence (single file, no separate DB server)
- Single Docker container deployment

## Running Locally

### Prerequisites

- Node.js 18+

### Install & Start

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Start both backend and frontend (dev mode)
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Production Build

```bash
npm run build
NODE_ENV=production node server.js
```

The server serves the built frontend statically on port 3000.

## Docker

```bash
docker build -t retroboard .
docker run -p 3000:3000 -v retroboard-data:/app/data retroboard
```

Visit http://localhost:3000

Data is persisted in the `/app/data` volume.

## Project Structure

```
├── server.js          # Express + Socket.io server
├── db.js              # SQLite database (sql.js)
├── routes/
│   └── boards.js      # REST API routes
├── client/            # Vite + React frontend
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       │   ├── MainPage.jsx
│       │   └── BoardPage.jsx
│       └── components/
│           ├── Card.jsx
│           ├── Column.jsx
│           └── GuestAuthModal.jsx
├── docs/
│   ├── api.md         # API documentation
│   └── frontend.md    # Frontend documentation
└── Dockerfile
```
