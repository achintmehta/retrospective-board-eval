# API reference

Two surfaces:

1. **REST** for CRUD on boards, columns, and CSV export.
2. **Socket.io** for realtime card / comment events inside a board.

Base URL in dev is `http://localhost:4000`. All requests use JSON unless noted.

## REST

### `GET /api/health`

Liveness probe.

**200** — `{"ok": true}`

---

### `GET /api/boards`

List all boards, most recent first.

**200**
```json
{
  "boards": [
    { "id": "brd_...", "title": "Sprint 42", "created_at": 1782900000000, "card_count": 12 }
  ]
}
```

---

### `POST /api/boards`

Create a board. Three default columns are added automatically.

**Body**
```json
{ "title": "Sprint 42" }
```

**201**
```json
{ "board": { "id": "brd_...", "title": "Sprint 42", "created_at": 1782900000000 } }
```

Errors: `400` if `title` is empty or > 120 chars.

---

### `GET /api/boards/:id`

Fetch a board with its columns, cards, and comments.

**200**
```json
{
  "board": {
    "id": "brd_...",
    "title": "Sprint 42",
    "created_at": 1782900000000,
    "columns": [
      {
        "id": "col_...", "title": "Went Well", "position": 0,
        "cards": [
          {
            "id": "card_...", "column_id": "col_...",
            "content": "Shipped feature X",
            "author_name": "Alice", "position": 0, "created_at": 1782900500000,
            "comments": [
              { "id": "cmt_...", "card_id": "card_...", "content": "🎉",
                "author_name": "Bob", "created_at": 1782900700000 }
            ]
          }
        ]
      }
    ]
  }
}
```

Errors: `404` if the board does not exist.

---

### `POST /api/boards/:id/columns`

Append a new column to a board.

**Body**
```json
{ "title": "Kudos" }
```

**201**
```json
{ "column": { "id": "col_...", "board_id": "brd_...", "title": "Kudos", "position": 3, "cards": [] } }
```

Errors: `400` on missing/invalid title, `404` if the board does not exist.

---

### `GET /api/boards/:id/export`

Streams a CSV of the entire board. One row per (column × card × comment). Cards without
comments emit a single row with empty comment fields; empty columns emit one blank row.

Response headers:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="<board-title>.csv"
```

Columns: `board_id, board_title, column, card_content, card_author, card_created_at,
comment_content, comment_author, comment_created_at`.

Errors: `404` if the board does not exist.

---

## Socket.io

Endpoint: `/socket.io` on the same origin. In dev the Vite proxy forwards WebSocket
traffic to port 4000.

### Connect and join a board

```js
socket.emit('join_board', { boardId, displayName }, (ack) => { /* { ok, error? } */ });
```

- Puts the socket into the room `board:<boardId>`.
- Broadcasts a `presence` event with the current member count to the whole room.
- All subsequent board events assume you have joined. `displayName` is used as the
  default `author_name` for cards and comments unless the client overrides it.

Rejects with `{ ok: false, error: "board not found" }` if the board does not exist.

### `add_card` → `card_added`

Client emits:
```js
socket.emit('add_card', { columnId, content, authorName? }, ack);
```
Server persists the card at the end of the column and broadcasts:
```js
socket.on('card_added', (card) => { /* card includes column_id, board_id, comments: [] */ });
```

### `move_card` → `card_moved`

Client emits when a card is dropped in a new column or reordered:
```js
socket.emit('move_card', { cardId, targetColumnId, targetIndex }, ack);
```
Server rewrites positions inside the source and target columns transactionally and
broadcasts:
```js
socket.on('card_moved', ({ card_id, from_column_id, to_column_id, board_id, new_index }) => { });
```

### `add_comment` → `comment_added`

```js
socket.emit('add_comment', { cardId, content, authorName? }, ack);
socket.on('comment_added', (comment) => { /* card_id, board_id, content, author_name, created_at */ });
```

### `presence`

Emitted to the room whenever a socket joins or disconnects:
```js
socket.on('presence', ({ boardId, count }) => { /* update the "N connected" pill */ });
```

### Reconnect behavior

Socket.io auto-reconnects. The client refetches the full board via `GET /api/boards/:id`
after any reconnect to correct for missed events.

## Validation limits

| Field                | Max length |
| -------------------- | ---------- |
| Board title          | 120        |
| Column title         | 60         |
| Card/comment content | 2000       |
| Display name         | 60         |

Requests exceeding these limits are truncated (WebSocket) or rejected with `400` (REST).
