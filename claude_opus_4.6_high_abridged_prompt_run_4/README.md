# RetroBoard

A real-time retrospective board for teams. Supports live collaboration via WebSockets, drag-and-drop card management, nested comments, and CSV export. Runs locally or as a single Docker container.

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts both the backend (port 3001) and frontend dev server (port 5173). Open [http://localhost:5173](http://localhost:5173).

### Production

```bash
npm run build
npm start
```

Open [http://localhost:3001](http://localhost:3001).

### Docker

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/app/data retro-board
```

The `-v` flag persists the SQLite database across container restarts.

## Features

- **Board Management** — Create boards, add custom columns (e.g. "Went Well", "Needs Improvement")
- **Real-Time Cards** — Add cards and see them appear instantly on all connected clients
- **Drag & Drop** — Move cards between columns with live sync
- **Nested Comments** — Discuss cards with threaded comments
- **Guest Auth** — Enter a display name to start collaborating, no account needed
- **CSV Export** — Download board data for offline analysis
- **Dark Theme** — Premium dark UI with smooth animations

## API Reference

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/boards` | List all boards |
| `POST` | `/api/boards` | Create a board (`{ "title": "..." }`) |
| `GET` | `/api/boards/:id` | Get board with columns, cards, and comments |
| `POST` | `/api/boards/:id/columns` | Add a column (`{ "title": "..." }`) |
| `GET` | `/api/boards/:id/export` | Download board data as CSV |

### WebSocket Events

Connect via Socket.io to the server.

**Client → Server:**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` | Join a board room |
| `add_card` | `{ columnId, content, authorName }` | Add a card |
| `move_card` | `{ cardId, newColumnId, newPosition }` | Move a card |
| `add_comment` | `{ cardId, content, authorName }` | Add a comment |
| `add_column` | `{ boardId, title }` | Add a column |

**Server → Client:**

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object | A card was added |
| `card_moved` | `{ cardId, newColumnId, newPosition }` | A card was moved |
| `comment_added` | Comment object | A comment was added |
| `column_added` | Column object | A column was added |

## Tech Stack

- **Frontend:** React, Vite, @hello-pangea/dnd, socket.io-client
- **Backend:** Node.js, Express, Socket.io, better-sqlite3
- **Database:** SQLite (WAL mode)

## Frontend Structure

```
client/src/
├── main.jsx          # App entry point
├── App.jsx           # Router setup
├── index.css         # Global dark theme styles
├── pages/
│   ├── HomePage.jsx  # Board listing and creation
│   └── BoardPage.jsx # Board view with columns, cards, drag-drop
└── components/
    ├── GuestAuthModal.jsx  # Display name prompt
    ├── CardModal.jsx       # Card detail with comments
    └── AddColumnForm.jsx   # Add column to board
```
