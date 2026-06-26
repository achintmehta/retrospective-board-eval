# API Documentation

Base URL: `http://localhost:3001/api`

## REST Endpoints

### Boards

#### `POST /api/boards`

Create a new board.

**Request body:**
```json
{ "title": "Sprint 12 Retro" }
```

**Response (201):**
```json
{ "id": "uuid", "title": "Sprint 12 Retro", "created_at": "2024-01-15T10:00:00" }
```

#### `GET /api/boards`

List all boards, ordered by creation date (newest first).

**Response (200):**
```json
[
  { "id": "uuid", "title": "Sprint 12 Retro", "created_at": "2024-01-15T10:00:00" }
]
```

#### `GET /api/boards/:id`

Get a board with all columns, cards, and comments.

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Sprint 12 Retro",
  "created_at": "2024-01-15T10:00:00",
  "columns": [
    {
      "id": "uuid",
      "board_id": "uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "uuid",
          "column_id": "uuid",
          "content": "Great team communication",
          "author_name": "Alice",
          "created_at": "2024-01-15T10:05:00",
          "position": 0,
          "comments": [
            {
              "id": "uuid",
              "card_id": "uuid",
              "content": "Agreed!",
              "author_name": "Bob",
              "created_at": "2024-01-15T10:06:00"
            }
          ]
        }
      ]
    }
  ]
}
```

### Columns

#### `POST /api/boards/:id/columns`

Add a column to a board.

**Request body:**
```json
{ "title": "Went Well" }
```

**Response (201):**
```json
{ "id": "uuid", "board_id": "uuid", "title": "Went Well", "position": 0 }
```

### Export

#### `GET /api/boards/:id/export`

Download board data as CSV.

**Response:** CSV file download with columns: Column, Card, Author, Created At, Comment, Comment Author, Comment Time.

## WebSocket Events

Connect via Socket.io to the server root.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId: string` | Join a board's real-time room |
| `add_card` | `{ columnId, content, authorName, boardId }` | Add a card to a column |
| `move_card` | `{ cardId, newColumnId, newPosition, boardId }` | Move a card between columns |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment to a card |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A card was added |
| `card_moved` | `{ cardId, newColumnId, newPosition, card }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |
| `column_added` | `column` | A column was added |
