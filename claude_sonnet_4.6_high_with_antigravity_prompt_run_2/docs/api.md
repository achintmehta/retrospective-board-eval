# API Reference

Base URL: `http://localhost:3001`

All REST endpoints accept and return `application/json` unless noted otherwise.

---

## Boards

### `GET /api/boards`
Returns all boards sorted by creation date (newest first).

**Response `200`**
```json
[
  { "id": "uuid", "title": "Sprint 42 Retro", "created_at": "2026-06-24T10:00:00Z" }
]
```

---

### `POST /api/boards`
Creates a new board with default columns ("Went Well", "Needs Improvement", "Action Items").

**Request body**
```json
{ "title": "Sprint 42 Retro" }
```

**Response `201`** — Full board object with columns
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
      "cards": []
    }
  ]
}
```

**Response `400`** — `{ "error": "title is required" }`

---

### `GET /api/boards/:id`
Returns a single board with nested columns, cards, and comments.

**Response `200`**
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "...",
  "columns": [
    {
      "id": "uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "uuid",
          "column_id": "uuid",
          "content": "Great team collaboration!",
          "author_name": "Alice",
          "position": 0,
          "created_at": "...",
          "comments": [
            { "id": "uuid", "card_id": "uuid", "content": "Agreed!", "author_name": "Bob", "created_at": "..." }
          ]
        }
      ]
    }
  ]
}
```

**Response `404`** — `{ "error": "Board not found" }`

---

### `POST /api/boards/:id/columns`
Adds a new column to a board.

**Request body**
```json
{ "title": "Shoutouts" }
```

**Response `201`**
```json
{ "id": "uuid", "board_id": "uuid", "title": "Shoutouts", "position": 3 }
```

Also broadcasts `column_added` event to all Socket.io clients in the board room.

---

### `GET /api/boards/:id/export`
Downloads the board as a CSV file.

**Response** — `text/csv` file with columns:
`Board, Column, Card, Author, Created At, Comments`

---

## WebSocket Events (Socket.io)

Connect to `ws://localhost:3001` (or through the Vite proxy at `ws://localhost:5173`).

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `{ boardId }` | Join a board room to receive broadcasts |
| `add_card` | `{ boardId, columnId, content, authorName }` | Create a new card |
| `move_card` | `{ boardId, cardId, targetColumnId, targetPosition }` | Move a card to a new column/position |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment to a card |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object | Broadcast when a card is created |
| `card_moved` | `{ cardId, targetColumnId, targetPosition }` | Broadcast when a card is moved |
| `comment_added` | Comment object with `card_id` | Broadcast when a comment is added |
| `column_added` | Column object | Broadcast when a column is added via REST |
