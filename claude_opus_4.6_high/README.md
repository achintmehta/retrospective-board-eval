# Retro Board

A real-time retrospective board for team collaboration. Create boards with configurable columns, add cards, drag-and-drop between columns, and comment on cards — all synchronized in real-time across connected clients.

## Quick Start

### Prerequisites
- Node.js 18+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the backend on `http://localhost:3001` and the frontend dev server on `http://localhost:5173`.

### Production

```bash
npm start
```

Builds the frontend and serves everything from `http://localhost:3001`.

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

## Features

- **Board Management** — Create boards and add configurable columns
- **Real-Time Collaboration** — Cards, moves, and comments sync instantly via WebSockets
- **Drag and Drop** — Move cards between columns
- **Nested Comments** — Discuss items directly on cards
- **Guest Auth** — Join with just a display name, no signup required
- **CSV Export** — Download board data as a CSV file
- **SQLite Storage** — Zero-config, single-file database

## Tech Stack

- **Backend:** Node.js, Express, Socket.io, better-sqlite3
- **Frontend:** React, Vite, @hello-pangea/dnd, socket.io-client
- **Database:** SQLite (WAL mode)

## API

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create a board (`{ title }`) |
| GET | `/api/boards/:id` | Get board with columns, cards, comments |
| POST | `/api/boards/:id/columns` | Add a column (`{ title }`) |
| GET | `/api/boards/:id/export` | Download board as CSV |

### WebSocket Events

**Client → Server:**
| Event | Payload |
|-------|---------|
| `join_board` | `boardId` |
| `add_card` | `{ boardId, columnId, content, authorName }` |
| `move_card` | `{ boardId, cardId, newColumnId, newPosition }` |
| `add_comment` | `{ boardId, cardId, content, authorName }` |

**Server → Client:**
| Event | Payload |
|-------|---------|
| `card_added` | Card object |
| `card_moved` | `{ id, column_id, position }` |
| `comment_added` | Comment object |
| `column_added` | Column object |

## Frontend Structure

```
client/src/
├── main.jsx          # Entry point with BrowserRouter
├── App.jsx           # Route definitions
├── pages/
│   ├── MainPage.jsx  # Board list + create form
│   └── BoardPage.jsx # Board view with real-time features
└── components/
    ├── GuestAuthModal.jsx  # Display name prompt
    ├── CardItem.jsx        # Card with comments
    ├── AddCardForm.jsx     # New card input
    └── AddColumnForm.jsx   # New column input
```
