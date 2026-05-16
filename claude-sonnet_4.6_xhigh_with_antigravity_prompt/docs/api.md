# RetroBoard API Documentation

Base URL: `http://localhost:3001`

All request/response bodies use `application/json`.

---

## Boards

### Create a Board

**POST** `/api/boards`

Creates a new retrospective board with three default columns: *Went Well*, *Needs Improvement*, *Action Items*.

**Request body**
```json
{ "title": "Sprint 42 Retrospective" }
```

**Response** `201 Created`
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retrospective",
  "created_at": "2026-05-14 21:00:00",
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

---

### List All Boards

**GET** `/api/boards`

Returns all boards sorted by creation date (newest first).

**Response** `200 OK`
```json
[
  { "id": "uuid", "title": "Sprint 42 Retrospective", "created_at": "..." }
]
```

---

### Get Board Details

**GET** `/api/boards/:id`

Returns a single board with all columns, cards, and comments.

**Response** `200 OK`
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retrospective",
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
          "content": "Good team communication",
          "author_name": "Alice",
          "position": 0,
          "created_at": "...",
          "comments": [
            {
              "id": "uuid",
              "card_id": "uuid",
              "content": "Agreed!",
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

**Error** `404 Not Found` — board does not exist

---

### Add a Column

**POST** `/api/boards/:id/columns`

Adds a new column to the board and broadcasts `column_added` to all connected WebSocket clients in the board room.

**Request body**
```json
{ "title": "Kudos" }
```

**Response** `201 Created`
```json
{
  "id": "uuid",
  "board_id": "uuid",
  "title": "Kudos",
  "position": 3,
  "cards": []
}
```

---

### Export Board as CSV

**GET** `/api/boards/:id/export`

Streams a CSV file containing all cards and comments.

**Response** — `Content-Type: text/csv`, triggers browser download.

**CSV columns**: `Column`, `Card Author`, `Card Content`, `Comment Author`, `Comment Content`, `Comment Date`

---

## WebSocket Events (Socket.io)

Connect to `http://localhost:3001` (or the Vite proxy in development).

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `{ boardId, displayName }` | Join a board room to receive real-time updates |
| `add_card` | `{ columnId, content }` | Add a card to a column |
| `move_card` | `{ cardId, newColumnId, newPosition }` | Move a card to a new column and position |
| `add_comment` | `{ cardId, content }` | Add a comment to a card |

### Server → Client (broadcast to board room)

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | full card object with `comments: []` | Emitted after a card is created |
| `card_moved` | `{ cardId, newColumnId, newPosition }` | Emitted after a card is moved |
| `comment_added` | `{ cardId, comment }` | Emitted after a comment is added |
| `column_added` | full column object with `cards: []` | Emitted after a column is created via REST |
| `user_joined` | `{ displayName }` | Emitted to peers when a user joins |
| `user_left` | `{ displayName }` | Emitted to peers when a user disconnects |

### Notes

- `displayName` is derived from `socket.data.displayName` set during `join_board`
- Only clients that have called `join_board` can emit `add_card`, `move_card`, `add_comment`
- The server broadcasts to the entire board room (including the sender) for `card_added`, `card_moved`, `comment_added`
