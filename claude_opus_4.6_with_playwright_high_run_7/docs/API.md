# API Documentation

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
{ "id": 1, "title": "Sprint 12 Retro", "created_at": "2024-01-01 00:00:00" }
```

#### `GET /api/boards`
List all boards sorted by creation date (newest first).

**Response (200):**
```json
[{ "id": 1, "title": "Sprint 12 Retro", "created_at": "2024-01-01 00:00:00" }]
```

#### `GET /api/boards/:id`
Get a board with all columns, cards, and comments.

**Response (200):**
```json
{
  "id": 1,
  "title": "Sprint 12 Retro",
  "created_at": "2024-01-01 00:00:00",
  "columns": [
    {
      "id": 1,
      "board_id": 1,
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": 1,
          "column_id": 1,
          "content": "Great teamwork",
          "author_name": "Alice",
          "position": 0,
          "created_at": "2024-01-01 00:00:00",
          "comments": []
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
{ "id": 1, "board_id": 1, "title": "Went Well", "position": 0 }
```

### Export

#### `GET /api/boards/:id/export`
Download board data as CSV.

**Response**: CSV file download with columns: Column, Card, Author, Comment, Comment Author, Created At.

## WebSocket Events

### Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` | Join a board's room |
| `leave_board` | `boardId` | Leave a board's room |
| `add_card` | `{ columnId, content, authorName, boardId }` | Add a card |
| `move_card` | `{ cardId, newColumnId, newPosition, boardId }` | Move a card |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment |
| `add_column` | `{ boardId, title }` | Add a column |

### Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A card was added |
| `card_moved` | `{ card, newColumnId, newPosition }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |
| `column_added` | `{ column }` | A column was added |
