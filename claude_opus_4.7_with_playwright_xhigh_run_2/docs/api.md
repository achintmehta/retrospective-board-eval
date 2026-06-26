# API Reference

The server exposes two surfaces: a small REST API for board lifecycle + CSV export, and
a Socket.io interface for everything that happens inside a board.

The base URL is the server origin (default `http://localhost:4000`). All JSON bodies use
UTF-8.

## REST endpoints

### `GET /api/health`
Returns `{ "ok": true, "time": "<ISO-8601>" }`. Use this for liveness checks.

### `GET /api/boards`
Lists boards, newest first.

```json
[
  { "id": "uuid", "title": "Sprint 42", "created_at": "2026-06-26 07:30:00" }
]
```

### `POST /api/boards`
Creates a new board. Default columns are *Went Well*, *Needs Improvement*, *Action Items*.

Request:
```json
{
  "title": "Sprint 42 Retro",
  "columns": ["Liked", "Learned", "Lacked"]   // optional
}
```

Responses:
- `201 Created` — full board object (see `GET /api/boards/:id` shape).
- `400 Bad Request` — `{ "error": "title is required" }`.

### `GET /api/boards/:id`
Returns a full board snapshot. The shape is:

```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "2026-06-26 07:30:00",
  "columns": [{ "id": "uuid", "board_id": "uuid", "title": "Went Well", "position": 0 }],
  "cards":   [{ "id": "uuid", "column_id": "uuid", "content": "…", "author_name": "Alice", "position": 0, "created_at": "…" }],
  "comments":[{ "id": "uuid", "card_id": "uuid", "content": "…", "author_name": "Alice", "created_at": "…" }]
}
```

Errors:
- `404 Not Found` — `{ "error": "board not found" }`.

### `POST /api/boards/:id/columns`
Appends a column to the board. The new column is broadcast to clients in the board's
room via `column_added`.

Request:
```json
{ "title": "Action Items" }
```

Responses:
- `201 Created` — `{ "id": "uuid", "board_id": "uuid", "title": "…", "position": 3 }`.
- `400 Bad Request` — missing title.
- `404 Not Found` — board does not exist.

### `GET /api/boards/:id/export`
Streams a CSV file. Headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="<slug>-<idprefix>.csv"
```

Each row pairs a card with one of its comments. Cards with no comments emit a single
row with empty comment columns. The file starts with a UTF-8 BOM so Excel opens it
correctly.

Columns:
`Column, Card, Card Author, Card Created At, Comment, Comment Author, Comment Created At`.

## Socket.io interface

Connect to the same origin: `io()` from the client. All events accept an optional
acknowledgement callback `(ack) => …`, which returns either `{ ok: true, … }` or
`{ ok: false, error: "…" }`.

### `join_board` (client → server)
Subscribes the connection to a board's room.

```js
socket.emit('join_board', { boardId, name }, (ack) => {
  // ack.ok === true; ack.board contains the full snapshot.
});
```

The server also remembers `name` for that socket so subsequent events can default
their `authorName` to the joined display name.

### `add_card` (client → server)
```js
socket.emit('add_card', { columnId, content, authorName }, (ack) => …);
```

Broadcasts `card_added` (the new card) to everyone in `board:<boardId>`.

### `move_card` (client → server)
```js
socket.emit('move_card', { cardId, toColumnId, newIndex }, (ack) => …);
```

Server re-sequences positions inside both the source and target columns then broadcasts
`card_moved` `{ card, fromColumnId, toColumnId }`.

### `add_comment` (client → server)
```js
socket.emit('add_comment', { cardId, content, authorName }, (ack) => …);
```

Broadcasts `comment_added` (the new comment) to the board's room.

### Server-emitted events (server → clients in a room)

| Event | Payload |
| --- | --- |
| `card_added` | `{ id, column_id, content, author_name, position, created_at }` |
| `card_moved` | `{ card, fromColumnId, toColumnId }` |
| `comment_added` | `{ id, card_id, content, author_name, created_at }` |
| `column_added` | `{ id, board_id, title, position }` |

## Error semantics

All REST handlers return JSON with an `error` string on failure. Socket events deliver
errors via the optional ack callback: `{ ok: false, error: "<message>" }`.

## Data model

```
boards (id, title, created_at)
  └── board_columns (id, board_id, title, position)
        └── cards (id, column_id, content, author_name, position, created_at)
              └── comments (id, card_id, content, author_name, created_at)
```

`ON DELETE CASCADE` is enabled on every foreign key, and the database runs with
`journal_mode = WAL` for safer concurrent writes.
