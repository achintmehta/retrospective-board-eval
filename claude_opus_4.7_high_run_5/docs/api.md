# API Reference

The backend exposes a small REST API for board lifecycle + export, and a
Socket.io interface for real-time collaboration. All REST responses are
JSON; timestamps are millisecond Unix epoch.

Base URL: `http://localhost:3001`.

## REST

### `GET /api/health`

Liveness probe. Returns `{ ok: true }`.

### `GET /api/boards`

List all boards sorted by creation time (newest first).

```json
[
  { "id": "...", "title": "Sprint 42 retro", "created_at": 1731600000000 }
]
```

### `POST /api/boards`

Create a new board. Three default columns ("Went Well", "Needs Improvement",
"Action Items") are seeded.

Request:
```json
{ "title": "Sprint 42 retro" }
```

Response `201`:
```json
{
  "id": "...",
  "title": "Sprint 42 retro",
  "created_at": 1731600000000,
  "columns": [
    { "id": "...", "board_id": "...", "title": "Went Well", "position": 0, "cards": [] },
    { "id": "...", "board_id": "...", "title": "Needs Improvement", "position": 1, "cards": [] },
    { "id": "...", "board_id": "...", "title": "Action Items", "position": 2, "cards": [] }
  ]
}
```

### `GET /api/boards/:id`

Fetch a single board with all columns, cards, and nested comments.

```json
{
  "id": "...",
  "title": "Sprint 42 retro",
  "created_at": 1731600000000,
  "columns": [
    {
      "id": "...",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "...",
          "column_id": "...",
          "content": "Shipped the new dashboard early",
          "author_name": "Alice",
          "created_at": 1731600000000,
          "position": 0,
          "comments": [
            {
              "id": "...",
              "card_id": "...",
              "content": "Big team effort 🎉",
              "author_name": "Bob",
              "created_at": 1731600060000
            }
          ]
        }
      ]
    }
  ]
}
```

Returns `404` if no such board exists.

### `POST /api/boards/:id/columns`

Add a new column. Position is appended to the end.

Request:
```json
{ "title": "Discussion" }
```

Response `201`:
```json
{ "id": "...", "board_id": "...", "title": "Discussion", "position": 3, "cards": [] }
```

Also broadcasts a `column_added` socket event to `board:<id>`.

### `GET /api/boards/:id/export`

Streams a CSV file with one row per (column, card, comment) tuple. Cards
without comments get a single row; empty columns get a row with empty card
fields, so every column is represented at least once.

Columns:
`board_title, column_title, card_content, card_author, card_created_at, comment_content, comment_author, comment_created_at`

Returns `Content-Type: text/csv` with an `attachment` disposition.

## Socket.io

Endpoint: `/socket.io` on the same origin as the REST API.

Client → server events all accept an optional ack callback which the server
calls with `{ ok: true, ... }` or `{ ok: false, error: "..." }`.

### `join_board`

Must be called before any other event. Joins the socket to room
`board:<boardId>` and returns the initial board state.

```js
socket.emit('join_board', { boardId, displayName }, (resp) => {
  if (resp.ok) console.log(resp.board);
});
```

### `add_card`

```js
socket.emit('add_card', { columnId, content });
// → broadcasts `card_added` (full card) to everyone in the room
```

### `move_card`

```js
socket.emit('move_card', { cardId, toColumnId, newPosition });
// → broadcasts `card_moved` with { cardId, fromColumnId, toColumnId, newPosition }
```

The server reorders positions in both the source and destination columns
inside a single SQLite transaction, so all clients see consistent ordering.

### `add_comment`

```js
socket.emit('add_comment', { cardId, content });
// → broadcasts `comment_added` with the saved comment
```

### Server → client events

| Event           | Payload                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| `card_added`    | `{ id, column_id, content, author_name, created_at, position, comments }` |
| `card_moved`    | `{ cardId, fromColumnId, toColumnId, newPosition }`                      |
| `comment_added` | `{ id, card_id, content, author_name, created_at }`                      |
| `column_added`  | `{ id, board_id, title, position, cards }`                               |

### Reconnects

If a client temporarily disconnects, `socket.io-client` will reconnect
automatically. On reconnect, the client re-emits `join_board`, which
re-fetches the authoritative state — guaranteeing the user sees a fresh
view even if events were missed during the disconnect window.

## Data model

```
boards          (id, title, created_at)
board_columns   (id, board_id → boards, title, position)
cards           (id, column_id → board_columns, content, author_name, created_at, position)
comments        (id, card_id → cards, content, author_name, created_at)
```

All foreign keys cascade on delete. The database runs in WAL mode for
better concurrent-read behavior.
