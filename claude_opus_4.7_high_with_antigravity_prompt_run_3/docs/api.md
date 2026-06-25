# Prism Retro — API Reference

The backend exposes two interfaces:

1. A **REST API** under `/api` for board CRUD and CSV export.
2. A **Socket.io** namespace at `/socket.io` for realtime collaboration.

All responses are JSON unless otherwise noted.

---

## REST endpoints

### `GET /api/health`

Health probe.

```json
{ "ok": true, "ts": 1717250000000 }
```

### `GET /api/boards`

List every board ordered by `createdAt` (newest first).

```json
{
  "boards": [
    {
      "id": "b3fb…",
      "title": "Sprint 24 retrospective",
      "createdAt": 1717250000000,
      "cardCount": 12
    }
  ]
}
```

### `POST /api/boards`

Create a new board. The board is seeded with three default columns
(*Went Well*, *To Improve*, *Action Items*).

Request body:

```json
{ "title": "Sprint 24 retrospective" }
```

`201 Created` response:

```json
{ "board": { "id": "…", "title": "…", "createdAt": 1717… } }
```

Validation:
- `title` is required and trimmed
- Max length: 120 characters

### `GET /api/boards/:id`

Fetch a board with the full graph of columns → cards → comments.

```json
{
  "board": {
    "id": "…",
    "title": "…",
    "createdAt": 1717…,
    "columns": [
      {
        "id": "…",
        "title": "Went Well",
        "position": 0,
        "createdAt": 1717…,
        "cards": [
          {
            "id": "…",
            "columnId": "…",
            "content": "…",
            "authorName": "Sasha",
            "position": 0,
            "createdAt": 1717…,
            "comments": [
              {
                "id": "…",
                "cardId": "…",
                "content": "Agreed!",
                "authorName": "Jamie",
                "createdAt": 1717…
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Returns `404` if the board is unknown.

### `POST /api/boards/:id/columns`

Append a new column to a board. The column is placed at the end (`position =
max(position) + 1`).

Request body:

```json
{ "title": "Action Items" }
```

`201 Created` response:

```json
{ "column": { "id": "…", "boardId": "…", "title": "…", "position": 3, "cards": [] } }
```

### `GET /api/boards/:id/export`

Stream the full board contents as CSV.

Headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="retro_<slug>_<timestamp>.csv"
```

CSV columns:

| Column | Description |
| ------ | ----------- |
| `column` | Column title the card belongs to |
| `card_id` | Card UUID (empty for column-only rows when a column has no cards) |
| `card_content` | Card body |
| `card_author` | Display name of the card author |
| `card_created_at` | ISO-8601 timestamp |
| `comment_id` | Comment UUID (empty when the card has no comments) |
| `comment_content` | Comment body |
| `comment_author` | Display name of the comment author |
| `comment_created_at` | ISO-8601 timestamp |

Cards with multiple comments produce one row per comment.

---

## Socket.io contract

Connect to the same origin as the REST API.

```js
import { io } from 'socket.io-client';
const socket = io();
```

### Lifecycle

1. **`join_board`** (client → server, with ack)

   ```js
   socket.emit('join_board', { boardId, displayName }, (ack) => {
     // ack: { ok: true } or { ok: false, error: 'Board not found' }
   });
   ```

   The server places the socket in the board's room and stamps the connection
   with `displayName` (used as the author name for subsequent events).

2. **`presence_update`** (server → client)

   Broadcast whenever a socket joins or leaves a board room.

   ```json
   { "boardId": "…", "connected": 4 }
   ```

### Card events

| Event | Direction | Payload | Acknowledgement |
| ----- | --------- | ------- | --------------- |
| `add_card` | client → server | `{ columnId, content }` | `{ ok, card? }` |
| `card_added` | server → room | `{ card }` | — |
| `move_card` | client → server | `{ cardId, toColumnId, toPosition }` | `{ ok }` |
| `card_moved` | server → room | `{ cardId, fromColumnId, toColumnId, toPosition }` | — |
| `add_comment` | client → server | `{ cardId, content }` | `{ ok, comment? }` |
| `comment_added` | server → room | `{ comment }` | — |

Notes:
- The server is the source of truth: it writes to SQLite first, then
  broadcasts.
- Card positions are zero-indexed within their column.
- `content` is trimmed and capped at 1000 characters.
- `displayName` is capped at 40 characters.

### Reconnection

`socket.io-client` reconnects automatically. The frontend re-emits
`join_board` on every `connect` event so realtime resumes after temporary
network drops; cards/comments authored while disconnected are not replayed —
the user should refresh to refetch full state if needed.
