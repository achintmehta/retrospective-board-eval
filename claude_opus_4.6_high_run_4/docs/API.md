# API Documentation

Base URL: `http://localhost:3001/api`

## Boards

### Create Board
- **POST** `/boards`
- Body: `{ "title": "Sprint 42 Retro" }`
- Response: `201` with board object

### List Boards
- **GET** `/boards`
- Response: `200` with array of boards sorted by creation date (newest first)

### Get Board
- **GET** `/boards/:id`
- Response: `200` with board including nested columns, cards, and comments
- Response: `404` if not found

### Create Column
- **POST** `/boards/:id/columns`
- Body: `{ "title": "Went Well" }`
- Response: `201` with column object

### Export Board
- **GET** `/boards/:id/export`
- Response: CSV file download containing all columns, cards, and comments

## WebSocket Events

Connect via Socket.io to the server root.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` (number) | Join a board's real-time room |
| `leave_board` | `boardId` (number) | Leave a board's room |
| `add_card` | `{ columnId, content, authorName }` | Add a card to a column |
| `move_card` | `{ cardId, targetColumnId, targetPosition }` | Move a card |
| `add_comment` | `{ cardId, content, authorName }` | Add a comment to a card |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A card was added |
| `card_moved` | `{ card, targetColumnId, targetPosition }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |
