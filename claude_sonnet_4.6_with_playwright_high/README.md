# Retro Board

A real-time retrospective board for teams. Run locally or via Docker — no external services required.

## Quick Start

### Local Development

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Start both backend and frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### Production (single process)

```bash
npm run start:prod
```

Serves the app on http://localhost:3001

### Docker

```bash
docker build -t retro-board .
docker run -p 3000:3000 -v retro-data:/data retro-board
```

Open http://localhost:3000

## Features

- Create and list retrospective boards
- Configure custom columns (e.g., "Went Well", "Needs Improvement", "Actions")
- Add cards to columns with your display name
- Drag and drop cards between columns — synced in real-time to all viewers
- Nested comments on cards
- Export board to CSV
- Guest authentication: just enter a display name to join
- SQLite storage in a single file (mapped to Docker volume for persistence)

## API Reference

### Boards

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/boards` | List all boards |
| `POST` | `/api/boards` | Create a board `{ title }` |
| `GET` | `/api/boards/:id` | Get board with columns, cards, comments |
| `POST` | `/api/boards/:id/columns` | Add a column `{ title }` |
| `GET` | `/api/boards/:id/export` | Download board as CSV |

### WebSocket Events

**Client → Server**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `{ boardId }` | Join a board room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card |
| `move_card` | `{ boardId, cardId, targetColumnId, position }` | Move a card |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment |

**Server → Client (broadcasts to board room)**

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | New card created |
| `card_moved` | `{ cardId, targetColumnId, position }` | Card moved |
| `comment_added` | `{ cardId, comment }` | Comment added |

## Frontend Overview

| File | Description |
|------|-------------|
| `client/src/pages/MainPage.jsx` | Board list and create form |
| `client/src/pages/BoardPage.jsx` | Board view with real-time sync and drag-and-drop |
| `client/src/components/GuestAuthModal.jsx` | Display name prompt |
| `client/src/components/CommentPanel.jsx` | Card comments dialog |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `DB_PATH` | `./data/retro.db` | SQLite database file path |
| `NODE_ENV` | — | Set to `production` to serve built frontend |
