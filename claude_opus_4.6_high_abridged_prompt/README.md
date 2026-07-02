# RetroBoard

A real-time retrospective board for teams. Create boards, add cards, drag-and-drop between columns, comment on cards, and export to CSV — all synchronized instantly across clients via WebSockets.

## Quick Start

### Prerequisites

- Node.js 18+

### Development

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the backend on `http://localhost:3001` and the frontend on `http://localhost:5173`.

### Production (Docker)

```bash
docker build -t retroboard .
docker run -p 3001:3001 -v retrodata:/app/data retroboard
```

Open `http://localhost:3001`.

## Architecture

| Layer     | Technology                    |
|-----------|-------------------------------|
| Frontend  | React + Vite                  |
| Backend   | Node.js + Express             |
| Real-time | Socket.io                     |
| Database  | SQLite (via sql.js)           |
| DnD       | @hello-pangea/dnd             |

## API Reference

### Boards

| Method | Endpoint                      | Description                        |
|--------|-------------------------------|------------------------------------|
| GET    | `/api/boards`                 | List all boards                    |
| POST   | `/api/boards`                 | Create a board (`{title}`)         |
| GET    | `/api/boards/:id`             | Get board with columns/cards       |
| POST   | `/api/boards/:id/columns`     | Add a column (`{title}`)          |
| GET    | `/api/boards/:id/export`      | Download board as CSV              |

### WebSocket Events

| Event (Client → Server) | Payload                                              |
|--------------------------|------------------------------------------------------|
| `join_board`             | `boardId`                                            |
| `add_card`               | `{boardId, columnId, content, authorName}`           |
| `move_card`              | `{boardId, cardId, newColumnId, newPosition}`        |
| `add_comment`            | `{boardId, cardId, content, authorName}`             |

| Event (Server → Client) | Payload                       |
|--------------------------|-------------------------------|
| `card_added`             | `{columnId, card}`            |
| `card_moved`             | `{cardId, newColumnId, newPosition}` |
| `comment_added`          | `{cardId, comment}`           |

## Frontend Pages

| Route          | Component   | Description                                |
|----------------|-------------|--------------------------------------------|
| `/`            | HomePage    | Lists all boards, create new board form    |
| `/board/:id`   | BoardPage   | Full board view with columns, cards, DnD   |

Guest authentication prompts for a display name on first visit to a board page. The name is stored in `sessionStorage`.
