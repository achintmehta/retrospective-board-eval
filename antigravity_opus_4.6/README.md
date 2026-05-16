# RetroBoard — Real-Time Retrospective Board

A self-hosted, real-time retrospective board application for team retrospectives. Built with React, Express, Socket.IO, and SQLite.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?logo=socket.io&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)

## Features

- **Real-time collaboration** — Cards, comments, and moves sync instantly across all connected clients via WebSocket
- **Drag-and-drop** — Easily move cards between columns
- **Guest sessions** — Join boards with just a display name, no sign-up required
- **Configurable columns** — Create custom columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- **Nested comments** — Add threaded comments to any card
- **CSV export** — Export board data for offline analysis
- **Single container deployment** — Run via Docker with SQLite persistence
- **Dark theme** — Premium glassmorphism design with smooth animations

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ 
- npm v9+

### Development

```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Start both server and client in development mode
npm run dev
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001

### Docker

```bash
# Build the Docker image
docker build -t retro-board .

# Run with persistent data
docker run -d -p 3001:3001 -v retro-data:/app/data retro-board
```

Access at http://localhost:3001

## Project Structure

```
├── server/                 # Express backend
│   ├── index.ts           # Server entry point
│   ├── db.ts              # SQLite initialization
│   ├── queries.ts         # Database query functions
│   ├── socket.ts          # Socket.IO event handlers
│   └── routes/
│       └── boards.ts      # REST API routes
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── App.tsx        # Root component with routing
│   │   ├── api.ts         # API client
│   │   ├── index.css      # Design system & styles
│   │   └── pages/
│   │       ├── MainPage.tsx   # Board listing & creation
│   │       └── BoardPage.tsx  # Board view with real-time features
│   └── vite.config.ts     # Vite configuration with proxy
├── Dockerfile              # Multi-stage Docker build
├── tsconfig.json           # TypeScript configuration
└── package.json            # Root project configuration
```

## API Reference

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/boards` | List all boards |
| `POST` | `/api/boards` | Create a new board |
| `GET` | `/api/boards/:id` | Get board with columns, cards, and comments |
| `POST` | `/api/boards/:id/columns` | Add a column to a board |
| `GET` | `/api/boards/:id/export` | Export board data as CSV |

### POST /api/boards

```json
// Request
{ "title": "Sprint 42 Retro" }

// Response (201)
{ "id": "uuid", "title": "Sprint 42 Retro", "created_at": "2024-01-01T00:00:00" }
```

### POST /api/boards/:id/columns

```json
// Request
{ "title": "Went Well" }

// Response (201)
{ "id": "uuid", "board_id": "board-uuid", "title": "Went Well", "position": 0 }
```

### WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join_board` | Client → Server | `boardId: string` | Join a board's room |
| `leave_board` | Client → Server | `boardId: string` | Leave a board's room |
| `add_card` | Client → Server | `{ boardId, columnId, content, authorName }` | Add a card |
| `card_added` | Server → Client | `Card` object | New card was added |
| `move_card` | Client → Server | `{ boardId, cardId, targetColumnId, newPosition }` | Move a card |
| `card_moved` | Server → Client | `{ cardId, targetColumnId, newPosition }` | Card was moved |
| `add_comment` | Client → Server | `{ boardId, cardId, content, authorName }` | Add a comment |
| `comment_added` | Server → Client | `{ cardId, comment }` | Comment was added |
| `add_column` | Client → Server | `{ boardId, column }` | Broadcast new column |
| `column_added` | Server → Client | `Column` object | Column was added |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DB_PATH` | `./data/retro.sqlite` | SQLite database file path |
| `NODE_ENV` | — | Set to `production` for production mode |

## License

ISC
