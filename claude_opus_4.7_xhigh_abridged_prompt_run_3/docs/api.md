# API Reference

Two surfaces:

- **REST** — CRUD for boards / columns, CSV export
- **Socket.io** — real-time card/comment events, room-based broadcast

Base URL in development: `http://localhost:4000` (or `http://localhost:5173` via Vite proxy).

---

## REST endpoints

All requests/responses are JSON. Errors are returned as `{ "error": "<message>" }` with an appropriate 4xx/5xx status.

### `GET /api/health`

Health check.

**Response 200**
```json
{ "ok": true }
```

### `GET /api/boards`

List boards, newest first.

**Response 200**
```json
{
  "boards": [
    { "id": "abc123", "title": "Sprint 42", "created_at": 1712345678901 }
  ]
}
```

### `POST /api/boards`

Create a new board with default or custom columns.

**Body**
```json
{
  "title": "Sprint 42",
  "columns": ["What went well", "What needs improvement", "Action items"]
}
```

- `title` — required, 1–120 chars
- `columns` — optional. If omitted or empty, the defaults above are used.

**Response 201**
```json
{
  "board": {
    "id": "abc123",
    "title": "Sprint 42",
    "created_at": 1712345678901,
    "columns": [
      { "id": "col1", "board_id": "abc123", "title": "What went well", "position": 0, "cards": [] }
    ]
  }
}
```

### `GET /api/boards/:id`

Fetch a full board — columns → cards → comments.

**Response 200**
```json
{
  "board": {
    "id": "abc123",
    "title": "Sprint 42",
    "created_at": 1712345678901,
    "columns": [
      {
        "id": "col1",
        "title": "What went well",
        "position": 0,
        "cards": [
          {
            "id": "card1",
            "column_id": "col1",
            "content": "Deployed on Friday",
            "author_name": "Alex",
            "position": 0,
            "created_at": 1712345678999,
            "comments": [
              {
                "id": "cmt1",
                "card_id": "card1",
                "content": "+1",
                "author_name": "Sam",
                "created_at": 1712345679999
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Response 404** if the board id doesn't exist.

### `POST /api/boards/:id/columns`

Append a new column to a board.

**Body**
```json
{ "title": "Follow-ups" }
```

- `title` — required, 1–60 chars

**Response 201**
```json
{ "column": { "id": "col2", "board_id": "abc123", "title": "Follow-ups", "position": 3, "cards": [] } }
```

### `GET /api/boards/:id/export`

Stream a CSV file with the entire board contents (columns, cards, comments). Rows are emitted with a fixed schema so the file can be re-imported into a spreadsheet without column negotiation.

**Response 200** (text/csv)

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="Sprint_42-abc123.csv"

board_id,board_title,column_id,column_title,column_position,card_id,card_content,card_author,card_position,card_created_at,comment_id,comment_content,comment_author,comment_created_at
abc123,Sprint 42,col1,What went well,0,card1,Deployed on Friday,Alex,0,2024-04-05T10:00:00.000Z,cmt1,+1,Sam,2024-04-05T10:00:01.000Z
```

Rules:

- Every card produces at least one row, even if it has zero comments.
- Every column produces at least one row, even if it has zero cards.
- Timestamps are ISO 8601 in UTC.

---

## Socket.io events

Connect to the same origin as the HTTP server. All action events use acknowledgement callbacks so the client can await success/failure.

### Server ← Client

#### `join_board`
Join a board's room and receive the current server-side snapshot.

**Payload**
```json
{ "boardId": "abc123", "name": "Alice" }
```

**Ack**
```json
{ "ok": true, "board": { /* full board tree */ } }
```
On error: `{ "ok": false, "error": "board not found" }`.

Side effect: every socket in the board's room receives `presence_updated`.

#### `leave_board`
Leave the current board room (no payload, no ack).

#### `add_card`
Create a card in a column and broadcast it.

**Payload**
```json
{ "columnId": "col1", "content": "Deployed on Friday" }
```

**Ack**
```json
{ "ok": true, "card": { /* card + empty comments */ } }
```
Requires 1–500 char `content`.

Side effect: `card_added` broadcast to the board's room.

#### `move_card`
Move a card into `targetColumnId` at `targetIndex` (0-based). Both source and destination columns are reindexed atomically.

**Payload**
```json
{ "cardId": "card1", "targetColumnId": "col2", "targetIndex": 0 }
```

**Ack**
```json
{ "ok": true }
```

Side effect: `card_moved` broadcast with the new ordered card lists for both affected columns.

#### `add_comment`
Add a comment to a card.

**Payload**
```json
{ "cardId": "card1", "content": "+1" }
```

**Ack**
```json
{ "ok": true, "comment": { /* comment */ } }
```

Side effect: `comment_added` broadcast to the board's room.

### Server → Client (broadcasts)

#### `presence_updated`
Fired when someone joins or leaves.
```json
{ "boardId": "abc123", "count": 3 }
```

#### `card_added`
```json
{ "boardId": "abc123", "card": { /* card + comments: [] */ } }
```

#### `card_moved`
```json
{
  "boardId": "abc123",
  "cardId": "card1",
  "sourceColumnId": "col1",
  "targetColumnId": "col2",
  "sourceCards": [ /* remaining cards in order */ ],
  "targetCards": [ /* cards in destination, including the moved card, in order */ ]
}
```

#### `comment_added`
```json
{ "boardId": "abc123", "comment": { /* comment */ } }
```

---

## Error handling

- REST endpoints return `{ "error": "..." }` with 400/404/500 as appropriate.
- Socket.io ack callbacks receive `{ ok: false, error: "..." }` on failure. The `error` string is safe to surface to end users.
- Content-length caps: card and comment content are capped at 500 chars, board titles at 120, column titles at 60. Longer inputs return a validation error.

## Data model summary

| Table          | Columns                                                 | Notes                                       |
| -------------- | ------------------------------------------------------- | ------------------------------------------- |
| `boards`       | `id`, `title`, `created_at`                             | `id` is a 12-char nanoid.                   |
| `board_columns`| `id`, `board_id`, `title`, `position`                   | Cascade-deleted when the board is removed.  |
| `cards`        | `id`, `column_id`, `content`, `author_name`, `position`, `created_at` | Cascade-deleted when the column is removed. |
| `comments`     | `id`, `card_id`, `content`, `author_name`, `created_at` | Cascade-deleted when the card is removed.   |

The connection runs with `PRAGMA journal_mode = WAL` for concurrent readers + a single writer, and `PRAGMA foreign_keys = ON` for cascade integrity.
