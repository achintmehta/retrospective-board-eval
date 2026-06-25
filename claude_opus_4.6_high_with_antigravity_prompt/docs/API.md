# API Documentation

Base URL: `http://localhost:3000`

## REST Endpoints

### Boards

#### Create Board
```
POST /api/boards
Content-Type: application/json

{ "title": "Sprint 42 Retro" }
```
Response: `201` with `{ id, title, created_at }`

#### List Boards
```
GET /api/boards
```
Response: `200` with array of `{ id, title, created_at }`, sorted by newest first.

#### Get Board (with columns, cards, comments)
```
GET /api/boards/:id
```
Response: `200` with `{ id, title, created_at, columns: [{ id, title, position, cards: [{ id, content, author_name, position, created_at, comments: [...] }] }] }`

### Columns

#### Create Column
```
POST /api/boards/:id/columns
Content-Type: application/json

{ "title": "Went Well" }
```
Response: `201` with `{ id, board_id, title, position, cards: [] }`

### Export

#### Export Board to CSV
```
GET /api/boards/:id/export
```
Response: `200` with `text/csv` — columns: Column, Card, Author, Created At, Comments.

## WebSocket Events

Connect via Socket.io to the server root.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` (number) | Join a board room |
| `leave_board` | `boardId` (number) | Leave a board room |
| `add_card` | `{ columnId, content, authorName, boardId }` | Add a card |
| `move_card` | `{ cardId, targetColumnId, position, boardId }` | Move a card |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment |
| `add_column` | `{ boardId, title }` | Add a column |

### Server → Client (broadcast to board room)

| Event | Payload |
|-------|---------|
| `card_added` | Full card object with `comments: []` |
| `card_moved` | `{ cardId, targetColumnId, position }` |
| `comment_added` | Full comment object |
| `column_added` | Full column object with `cards: []` |
