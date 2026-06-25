# API Documentation

Base URL: `http://localhost:3001`

## REST Endpoints

### Boards

#### `GET /api/boards`
Returns all boards sorted by creation date (newest first).

**Response** `200 OK`
```json
[
  { "id": "uuid", "title": "Sprint 42 Retro", "created_at": "2024-01-15 10:00:00" }
]
```

#### `POST /api/boards`
Creates a new board with default columns (*Went Well*, *Needs Improvement*, *Action Items*).

**Body**
```json
{ "title": "My Retro", "columns": ["Went Well", "Needs Improvement"] }
```
`columns` is optional — omit to get the three defaults.

**Response** `201 Created` — full board object with columns, cards, and comments.

#### `GET /api/boards/:id`
Returns a single board with its full nested structure.

**Response** `200 OK`
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
          "content": "Great teamwork",
          "author_name": "Alice",
          "position": 0,
          "created_at": "...",
          "comments": [
            { "id": "uuid", "content": "+1!", "author_name": "Bob", "created_at": "..." }
          ]
        }
      ]
    }
  ]
}
```

**Errors**: `404 Not Found`

#### `POST /api/boards/:id/columns`
Adds a column to an existing board and broadcasts `column_added` to all connected clients.

**Body**
```json
{ "title": "New Column" }
```

**Response** `201 Created` — the created column object.

### Export

#### `GET /api/boards/:id/export`
Downloads board data as a CSV file.

**Response** `200 OK` with `Content-Type: text/csv` and `Content-Disposition: attachment`.

CSV columns: `Board, Column, Card Content, Card Author, Card Created At, Comment Content, Comment Author, Comment Created At`.

---

## WebSocket Events (Socket.io)

Connect to the server using Socket.io. After connecting, join a board room:

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId: string` | Join the board room to receive real-time updates |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card to a column |
| `move_card` | `{ boardId, cardId, newColumnId, newPosition }` | Move a card to a new column/position |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment to a card |

`add_card`, `move_card`, and `add_comment` accept an optional acknowledgement callback.

### Server → Client (broadcast to board room)

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A new card was added |
| `card_moved` | `{ cardId, newColumnId, newPosition }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added to a card |
| `column_added` | `column` | A new column was added |
