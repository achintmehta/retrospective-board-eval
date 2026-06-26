# API reference

The server exposes a small REST surface plus a Socket.io endpoint for real-time collaboration. All payloads are JSON. The default base URL is `http://localhost:3001`.

## Conventions

- Identifiers are server-issued UUIDs.
- Timestamps (`created_at`) are Unix epoch milliseconds.
- Errors return `{ "error": "<message>" }` with an appropriate HTTP status.

## REST

### `GET /api/health`

Liveness probe.

```json
{ "ok": true }
```

### `GET /api/boards`

Returns all boards, newest first.

```json
[
  { "id": "…", "title": "Sprint 42", "created_at": 1729000000000 }
]
```

### `POST /api/boards`

Create a new board. Three default columns are seeded.

Request body:

```json
{ "title": "Sprint 42 Retro" }
```

Response (`201 Created`): the full board with nested columns and empty card lists. The shape matches `GET /api/boards/:id`.

Errors: `400` if the title is missing or empty.

### `GET /api/boards/:id`

Returns a board with all columns, cards, and comments hydrated.

```json
{
  "id": "…",
  "title": "Sprint 42 Retro",
  "created_at": 1729000000000,
  "columns": [
    {
      "id": "…",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "…",
          "column_id": "…",
          "content": "Shipped the rewrite",
          "author_name": "Alice",
          "position": 0,
          "created_at": 1729000010000,
          "comments": [
            {
              "id": "…",
              "card_id": "…",
              "author_name": "Bob",
              "content": "Nice!",
              "created_at": 1729000020000
            }
          ]
        }
      ]
    }
  ]
}
```

Errors: `404` if the board does not exist.

### `POST /api/boards/:id/columns`

Append a new column to a board. The new column is also broadcast to that board's Socket.io room as `column_added`.

Request body:

```json
{ "title": "Action Items" }
```

Response (`201 Created`):

```json
{
  "id": "…",
  "board_id": "…",
  "title": "Action Items",
  "position": 3,
  "created_at": 1729000030000
}
```

Errors: `404` board not found, `400` invalid title.

### `GET /api/boards/:id/export`

Streams the board as CSV. The browser is prompted to download a file named `<title>-<id>.csv`.

Columns:

```
type,column,card_author,card_content,comment_author,comment_content,created_at
```

`type` is one of `column` (empty columns appear as a single row), `card`, or `comment`.

Errors: `404` board not found.

## Socket.io

Connect to the same origin at the default `/socket.io` path. The client is shipped with `socket.io-client` v4.

```js
import { io } from 'socket.io-client';
const socket = io({ path: '/socket.io' });
```

### Client → Server

All emit handlers accept an optional ack callback:

```js
socket.emit('event', payload, (res) => {
  // res = { ok: true, ... } or { ok: false, error: '…' }
});
```

| Event | Payload | Ack |
| --- | --- | --- |
| `join_board` | `{ boardId }` | `{ ok: true }` or `{ ok: false, error }` |
| `leave_board` | `{ boardId }` | — |
| `add_card` | `{ columnId, content, authorName }` | `{ ok: true, card }` |
| `move_card` | `{ cardId, toColumnId, toPosition? }` | `{ ok: true, card }` |
| `add_comment` | `{ cardId, content, authorName }` | `{ ok: true, comment }` |

`toPosition` is optional; if omitted the card is appended to the end of the destination column.

### Server → Client (room broadcasts)

Each board has its own Socket.io room named `board:<boardId>`. Joining via `join_board` subscribes the socket to that room. Broadcasts fire to every member, including the originator (clients can de-dupe on `id` if they applied optimistic updates).

| Event | Payload |
| --- | --- |
| `card_added` | `{ id, column_id, content, author_name, position, created_at }` |
| `card_moved` | Same shape as `card_added` (with updated `column_id` and `position`) |
| `comment_added` | `{ id, card_id, content, author_name, created_at }` |
| `column_added` | `{ id, board_id, title, position, created_at }` |

### Reconnect strategy

`socket.io-client` reconnects automatically. On reconnect the frontend rejoins the board room and re-fetches the board to recover any missed deltas.
