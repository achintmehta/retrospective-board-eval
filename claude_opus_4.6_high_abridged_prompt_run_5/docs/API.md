# API Documentation

Base URL: `http://localhost:3001/api`

## REST Endpoints

### Boards

#### Create Board
```
POST /api/boards
Content-Type: application/json

{ "title": "Sprint 42 Retro" }
```
**Response:** `201 Created`
```json
{ "id": 1, "title": "Sprint 42 Retro", "created_at": "2024-01-15T10:30:00.000Z" }
```

#### List Boards
```
GET /api/boards
```
**Response:** `200 OK`
```json
[
  { "id": 1, "title": "Sprint 42 Retro", "created_at": "2024-01-15T10:30:00.000Z" }
]
```

#### Get Board
```
GET /api/boards/:id
```
**Response:** `200 OK` — Returns the board with all columns, cards, and comments nested.

#### Add Column
```
POST /api/boards/:id/columns
Content-Type: application/json

{ "title": "Went Well" }
```
**Response:** `201 Created`
```json
{ "id": 1, "board_id": 1, "title": "Went Well", "position": 0 }
```

#### Export Board to CSV
```
GET /api/boards/:id/export
```
**Response:** `200 OK` — Downloads a CSV file with columns: Column, Card, Author, Comment, Comment Author, Created At.

## WebSocket Events

Connect via Socket.io to the server root.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` (number) | Join a board room to receive updates |
| `add_card` | `{ columnId, content, authorName }` | Add a card to a column |
| `move_card` | `{ cardId, newColumnId, newPosition, boardId }` | Move a card between columns |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment to a card |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `column_added` | Column object | A new column was added |
| `card_added` | Card object with empty comments array | A new card was added |
| `card_moved` | `{ id, column_id, position }` | A card was moved |
| `comment_added` | Comment object | A new comment was added |
