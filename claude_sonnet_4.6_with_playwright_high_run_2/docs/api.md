# REST API Reference

Base URL: `http://localhost:3001`

## Boards

### List all boards

```
GET /api/boards
```

Returns all boards sorted by creation date (newest first).

**Response** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Sprint 42 Retro",
    "created_at": "2024-01-15 10:00:00"
  }
]
```

---

### Create a board

```
POST /api/boards
```

**Body**
```json
{ "title": "Sprint 42 Retro" }
```

**Response** `201 Created`
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "2024-01-15 10:00:00"
}
```

---

### Get a board with full details

```
GET /api/boards/:id
```

Returns the board along with its columns, cards, and comments.

**Response** `200 OK`
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "...",
  "columns": [
    { "id": "uuid", "board_id": "uuid", "title": "Went Well", "position": 0 }
  ],
  "cards": [
    { "id": "uuid", "column_id": "uuid", "content": "Great teamwork", "author_name": "Alice", "created_at": "...", "position": 0 }
  ],
  "comments": [
    { "id": "uuid", "card_id": "uuid", "content": "Agreed!", "author_name": "Bob", "created_at": "..." }
  ]
}
```

**Response** `404 Not Found` if the board does not exist.

---

### Create a column

```
POST /api/boards/:id/columns
```

**Body**
```json
{ "title": "Action Items" }
```

**Response** `201 Created`
```json
{
  "id": "uuid",
  "board_id": "uuid",
  "title": "Action Items",
  "position": 2
}
```

---

### Export board as CSV

```
GET /api/boards/:id/export
```

Streams a CSV file download containing all cards and their comments.

**CSV columns**: `Column`, `Card`, `Author`, `Created At`, `Comments`

Multiple comments on a card are joined with ` | `.

**Response** `200 OK` — `Content-Type: text/csv` with a filename attachment header.

---

## WebSocket Events (Socket.io)

Connect to the server and use these events for real-time collaboration.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId: string` | Join a board room to receive broadcasts |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a new card |
| `move_card` | `{ boardId, cardId, newColumnId, newPosition }` | Move a card to a new column/position |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment to a card |
| `add_column` | `{ boardId, title }` | Add a new column to a board |

### Server → Client (broadcast to board room)

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object | Broadcast when a card is added |
| `card_moved` | `{ cardId, newColumnId, newPosition }` | Broadcast when a card is moved |
| `comment_added` | Comment object | Broadcast when a comment is added |
| `column_added` | Column object | Broadcast when a column is added |
