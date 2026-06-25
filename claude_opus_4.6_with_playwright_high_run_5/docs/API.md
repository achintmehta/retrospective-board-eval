# API Documentation

Base URL: `http://localhost:3001/api`

## Boards

### Create Board
`POST /api/boards`

Body: `{ "title": "Sprint 42 Retro" }`

Response: `201` with board object.

### List Boards
`GET /api/boards`

Response: `200` with array of board objects, sorted by creation date descending.

### Get Board
`GET /api/boards/:id`

Response: `200` with board object including columns, cards, and comments.

### Create Column
`POST /api/boards/:id/columns`

Body: `{ "title": "Went Well" }`

Response: `201` with column object.

### Export Board to CSV
`GET /api/boards/:id/export`

Response: CSV file download with columns: Column, Card, Card Author, Comment, Comment Author.

## WebSocket Events

Connect via Socket.io to the server root.

### Client -> Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` | Join a board room for real-time updates |
| `add_card` | `{ columnId, content, authorName, boardId }` | Add a card to a column |
| `move_card` | `{ cardId, newColumnId, boardId }` | Move a card to a different column |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment to a card |

### Server -> Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object | A card was added |
| `card_moved` | Card object | A card was moved |
| `comment_added` | Comment object | A comment was added |
