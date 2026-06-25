# API Documentation

Base URL: `http://localhost:3001/api`

## Boards

### Create Board
`POST /boards`

**Body:**
```json
{
  "title": "Sprint 42 Retro",
  "columns": ["Went Well", "Needs Improvement", "Action Items"]
}
```
`columns` is optional — defaults to `["Went Well", "Needs Improvement", "Action Items"]`.

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "2024-01-15T10:00:00.000Z",
  "columns": [
    { "id": "uuid", "board_id": "uuid", "title": "Went Well", "position": 0 }
  ]
}
```

---

### List Boards
`GET /boards`

**Response:** `200 OK` — array of boards sorted by creation date (newest first).

---

### Get Board
`GET /boards/:id`

Returns the full board with columns, cards, and comments nested.

**Response:** `200 OK`
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
          "content": "Great team collaboration",
          "author_name": "Alex",
          "created_at": "...",
          "position": 0,
          "comments": [
            {
              "id": "uuid",
              "content": "Agreed!",
              "author_name": "Sam",
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

### Add Column
`POST /boards/:id/columns`

**Body:**
```json
{ "title": "Blockers" }
```

**Response:** `201 Created`
```json
{ "id": "uuid", "board_id": "uuid", "title": "Blockers", "position": 3 }
```

---

### Export Board to CSV
`GET /boards/:id/export`

Streams a CSV file download with columns:
`board_title, column, card_id, card_content, card_author, card_created_at, comment_id, comment_content, comment_author, comment_created_at`

---

## WebSocket Events (Socket.io)

Connect to the same server on `/socket.io`.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId: string` | Join a board room |
| `leave_board` | `boardId: string` | Leave a board room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card |
| `move_card` | `{ boardId, cardId, newColumnId, newPosition }` | Move a card |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment |
| `add_column` | `{ boardId, column }` | Broadcast new column to other clients |

### Server → Client (broadcast to room)

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ card, columnId }` | New card added |
| `card_moved` | `{ card, newColumnId, newPosition }` | Card moved |
| `comment_added` | `{ comment, cardId }` | Comment added |
| `column_added` | `{ column }` | Column added |
