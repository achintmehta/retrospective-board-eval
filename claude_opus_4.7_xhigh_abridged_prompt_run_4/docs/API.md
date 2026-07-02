# API Reference

All REST endpoints are mounted at `/api`. Realtime events are exchanged over the Socket.io connection at `/socket.io`.

## REST

All requests and responses use JSON except CSV export.

### `GET /api/health`

Health probe.

**Response:** `200 { "ok": true }`

### `GET /api/boards`

List all boards, newest first.

**Response:** `200 [ Board, ... ]`

```jsonc
[
  {
    "id": "9d8e...",
    "title": "Sprint 42 retro",
    "created_at": "2026-07-02T12:00:00.000Z",
    "card_count": 12
  }
]
```

### `POST /api/boards`

Create a new board. The system provisions three default columns: `Went Well`, `To Improve`, `Action Items`. Additional columns can be created via `POST /api/boards/:id/columns` or the `add_column` socket event.

**Body:**
```json
{ "title": "Sprint 42 retro" }
```

**Response:** `201 Board` (full board with default columns).
**Errors:** `400` if `title` is empty or exceeds 120 characters.

### `GET /api/boards/:id`

Fetch a board with its columns, cards, and comments.

**Response:** `200`
```jsonc
{
  "id": "9d8e...",
  "title": "Sprint 42 retro",
  "created_at": "2026-07-02T12:00:00.000Z",
  "columns": [
    {
      "id": "col-1",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "card-1",
          "column_id": "col-1",
          "content": "Deployment automation shipped",
          "author_name": "Alex",
          "created_at": "2026-07-02T12:03:00.000Z",
          "position": 0,
          "comments": [
            {
              "id": "c-1",
              "card_id": "card-1",
              "content": "Big win.",
              "author_name": "Sam",
              "created_at": "2026-07-02T12:04:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```
**Errors:** `404` if board does not exist.

### `POST /api/boards/:id/columns`

Add a new column to a board. The `position` is set to the next slot at the end.

**Body:** `{ "title": "Kudos" }`
**Response:** `201 Column` (without cards).
**Errors:** `400` on empty/oversize title, `404` if board is missing.

### `GET /api/boards/:id/export`

Stream the board contents as CSV with a UTF-8 BOM. Suitable for Excel / Sheets.

Headers:
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="<board_title>.csv"`

Columns:
`type, column, card_author, card_content, card_created_at, comment_author, comment_content, comment_created_at`

Row types:
- `column` — one row per empty column.
- `card` — one row per card.
- `comment` — one row per comment (repeats the parent card's fields).

**Errors:** `404` if board is missing.

## Socket.io

All events go through the Socket.io connection at `/socket.io`. Every event supports an ack callback that receives `{ ok: true, ... }` on success or `{ ok: false, error: "..." }` on failure. Broadcasts are scoped to the board room (`board:<boardId>`).

### `join_board`

**Payload:** `{ boardId: string }`

Client joins the board's room. Server emits `presence` to the room with the updated count.

### `add_card`

**Payload:** `{ columnId, content, authorName }`
**Broadcasts:** `card_added` with the persisted card `{ id, column_id, content, author_name, created_at, position, comments: [] }`.

Validation: non-empty trimmed content up to 500 chars; non-empty author name up to 40 chars.

### `move_card`

**Payload:** `{ cardId, toColumnId, toIndex }`
**Broadcasts:** `card_moved` with `{ cardId, toColumnId, position }`.

Server rewrites `position` on both source and destination columns to keep them dense.

### `add_comment`

**Payload:** `{ cardId, content, authorName }`
**Broadcasts:** `comment_added` with `{ id, card_id, content, author_name, created_at }`.

### `add_column`

**Payload:** `{ boardId, title }`
**Broadcasts:** `column_added` with the new column `{ id, board_id, title, position, cards: [] }`.

### Emitted by the server

| Event           | Payload |
| --------------- | ------- |
| `card_added`    | `Card` |
| `card_moved`    | `{ cardId, toColumnId, position }` |
| `comment_added` | `Comment` |
| `column_added`  | `Column` |
| `presence`      | `{ count: number }` |

## Data model

```
boards        (id PK, title, created_at)
board_columns (id PK, board_id FK boards, title, position)
cards         (id PK, column_id FK board_columns, content, author_name, created_at, position)
comments      (id PK, card_id FK cards, content, author_name, created_at)
```

All identifiers are UUIDs (v4). Timestamps are ISO 8601 UTC strings. `board_columns.position` and `cards.position` are dense integer indexes within their parent.
