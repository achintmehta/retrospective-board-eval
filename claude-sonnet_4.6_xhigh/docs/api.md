# API Reference

Base URL: `http://localhost:3001/api`

## Boards

### `POST /boards`

Create a new board.

**Request body**
```json
{ "title": "Sprint 42 Retro" }
```

**Response** `201`
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "2026-01-01T00:00:00"
}
```

---

### `GET /boards`

List all boards, sorted by creation date (newest first).

**Response** `200`
```json
[
  { "id": "uuid", "title": "Sprint 42 Retro", "created_at": "..." },
  ...
]
```

---

### `GET /boards/:id`

Fetch a board with its columns, cards, and comments.

**Response** `200`
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "...",
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
          "content": "Great team collaboration",
          "author_name": "Alice",
          "position": 0,
          "created_at": "...",
          "comments": [
            {
              "id": "uuid",
              "card_id": "uuid",
              "content": "+1",
              "author_name": "Bob",
              "created_at": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

---

### `POST /boards/:id/columns`

Add a column to a board.

**Request body**
```json
{ "title": "Needs Improvement" }
```

**Response** `201`
```json
{
  "id": "uuid",
  "board_id": "uuid",
  "title": "Needs Improvement",
  "position": 1,
  "cards": []
}
```

---

### `GET /boards/:id/export`

Download board data as a CSV file.

**Response** `200` — `Content-Type: text/csv`

Columns in CSV: `Column, Card Author, Card Content, Comment Author, Comment Content, Comment Date`

---

## WebSocket Events

Connect to the server using `socket.io-client`.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `{ boardId, displayName }` | Join a board room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card |
| `move_card` | `{ boardId, cardId, targetColumnId, targetPosition }` | Move a card |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment |
| `add_column` | `{ boardId, title }` | Add a column |

### Server → Client (broadcast to board room)

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ card, columnId }` | New card created |
| `card_moved` | `{ cardId, targetColumnId, targetPosition }` | Card position updated |
| `comment_added` | `{ comment, cardId }` | New comment created |
| `column_added` | `{ column }` | New column created |
