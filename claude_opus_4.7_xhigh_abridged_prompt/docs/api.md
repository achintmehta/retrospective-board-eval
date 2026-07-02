# API Reference

The backend exposes two surfaces:

1. **REST** under `/api` — used to create and fetch boards and to stream a CSV export.
2. **Socket.io** — used for real-time collaboration on a board.

All timestamps are UNIX millisecond epoch integers unless noted otherwise. All request
and response bodies use JSON.

---

## REST

### `GET /api/health`

Health probe.

**200 OK**
```json
{ "ok": true, "ts": 1735000000000 }
```

### `GET /api/boards`

Lists all boards, newest first. Includes convenience counts.

**200 OK**
```json
{
  "boards": [
    {
      "id": "1JZZ4dFe6t6_",
      "title": "Sprint 24 Retro",
      "createdAt": 1735000000000,
      "cardCount": 8,
      "columnCount": 3
    }
  ]
}
```

### `POST /api/boards`

Creates a new board. On creation the board is seeded with three columns: **Went
Well**, **Needs Improvement**, and **Action Items**.

**Request**
```json
{ "title": "Sprint 24 Retro" }
```

- `title` — required, 1–120 characters (trimmed).

**201 Created**
```json
{ "board": { "id": "...", "title": "...", "createdAt": 0, "columns": [ ... ] } }
```

**400** — `{"error":"Title is required"}` when the title is missing or empty.

### `GET /api/boards/:id`

Fetches a board with all its columns, cards, and comments.

**200 OK**
```json
{
  "board": {
    "id": "1JZZ4dFe6t6_",
    "title": "Sprint 24 Retro",
    "createdAt": 1735000000000,
    "columns": [
      { "id": "col_1", "title": "Went Well", "position": 1000, "createdAt": 0 }
    ],
    "cards": [
      {
        "id": "card_1",
        "columnId": "col_1",
        "content": "Great planning session",
        "authorName": "Alex",
        "position": 1000,
        "createdAt": 0
      }
    ],
    "comments": [
      {
        "id": "cmt_1",
        "cardId": "card_1",
        "content": "Agreed!",
        "authorName": "Blake",
        "createdAt": 0
      }
    ]
  }
}
```

**404** — `{"error":"Board not found"}`.

### `POST /api/boards/:id/columns`

Adds a new column to a board. Also broadcasts a `column_added` event to the board room.

**Request**
```json
{ "title": "Kudos" }
```

- `title` — required, 1–60 characters.

**201 Created**
```json
{ "column": { "id": "...", "title": "Kudos", "position": 4000, "createdAt": 0 } }
```

### `GET /api/boards/:id/export`

Streams a CSV containing the board's columns, cards, and comments. Empty columns and
cards without comments are still represented (blank fields).

**Response**
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="<slug>-retro.csv"`

CSV header:

```
board_title,column,card_content,card_author,card_created_at,comment_content,comment_author,comment_created_at
```

`*_created_at` fields are ISO-8601 strings.

---

## Socket.io

The Socket.io endpoint is served from the same origin as the REST API (upgrade path:
`/socket.io/`). Rooms are keyed by `board:<boardId>`. Every payload uses acknowledgement
callbacks so the client can detect failures.

### Client → Server events

#### `join_board`

Required before any other action. Registers the display name for this connection and
joins the board room.

```js
socket.emit('join_board', { boardId, displayName }, (ack) => {
  // ack: { ok: true, board } or { ok: false, error }
});
```

- `boardId` — string, required.
- `displayName` — 1–60 chars, required.

Server responds by broadcasting an updated `presence` event to the room.

#### `add_card`

```js
socket.emit('add_card', { columnId, content }, ack);
```

- `content` — 1–2000 chars.
- Broadcasts `card_added` to the board room.

#### `move_card`

```js
socket.emit('move_card', { cardId, toColumnId, toIndex }, ack);
```

- `toIndex` — target position within the destination column (0-based).
- Broadcasts `card_moved`.

#### `add_comment`

```js
socket.emit('add_comment', { cardId, content }, ack);
```

- `content` — 1–1000 chars.
- Broadcasts `comment_added`.

#### `add_column`

```js
socket.emit('add_column', { title }, ack);
```

- `title` — 1–60 chars.
- Broadcasts `column_added`.

### Server → Client events

| Event           | Payload                                         |
| --------------- | ----------------------------------------------- |
| `card_added`    | `{ card: { id, columnId, content, ... } }`      |
| `card_moved`    | `{ card: { id, fromColumnId, toColumnId, position } }` |
| `comment_added` | `{ comment: { id, cardId, content, ... } }`     |
| `column_added`  | `{ column: { id, title, position, ... } }`      |
| `presence`      | `{ users: [{ id, displayName }] }`              |

`presence` is emitted whenever the composition of a board room changes.

### Error handling

Every mutation returns an acknowledgement of the shape:

```json
{ "ok": true,  ... }
{ "ok": false, "error": "..." }
```

The frontend surfaces failed acks as toast notifications and, for `move_card`, rolls
back optimistic state by refetching the board via REST.

---

## Data model

```
boards
  id             text pk
  title          text
  created_at     integer (ms)

board_columns
  id             text pk
  board_id       text fk → boards.id (cascade)
  title          text
  position       real            -- sparse ordering: 1000, 2000, ...
  created_at     integer (ms)

cards
  id             text pk
  column_id      text fk → board_columns.id (cascade)
  content        text
  author_name    text
  position       real            -- sparse ordering within column
  created_at     integer (ms)

comments
  id             text pk
  card_id        text fk → cards.id (cascade)
  content        text
  author_name    text
  created_at     integer (ms)
```

- SQLite runs in WAL mode with `foreign_keys = ON` and a 5s busy timeout.
- Positions are `REAL` values; on move, the server inserts between neighbours (average
  of prev/next). If precision collides, it rebalances the entire column to `(i+1)*1000`.
