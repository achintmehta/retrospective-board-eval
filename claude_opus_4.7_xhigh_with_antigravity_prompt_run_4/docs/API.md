# RetroFlow API

The backend exposes two surfaces:

1. **HTTP REST** — used for board CRUD, fetching board state, and CSV export.
2. **Socket.io events** — used for real-time card / comment / column updates.

Base URL in development: `http://localhost:3001`. The Vite dev server proxies the same
paths from `http://localhost:5173` so the client can use relative URLs.

---

## Data model

```
boards
  id          TEXT  PK
  title       TEXT
  created_at  INTEGER (ms since epoch)

board_columns
  id          TEXT  PK
  board_id    TEXT  → boards.id (cascade delete)
  title       TEXT
  position    INTEGER

cards
  id          TEXT  PK
  column_id   TEXT  → board_columns.id (cascade delete)
  content     TEXT
  author_name TEXT
  position    INTEGER
  created_at  INTEGER

comments
  id          TEXT  PK
  card_id     TEXT  → cards.id (cascade delete)
  content     TEXT
  author_name TEXT
  created_at  INTEGER
```

Newly created boards automatically receive three default columns: **Went Well**, **To
Improve**, **Action Items**. Add more via `POST /api/boards/:id/columns`.

---

## REST endpoints

### `GET /api/health`

Liveness probe.

```json
{ "status": "ok", "uptime": 12.34 }
```

### `POST /api/boards`

Create a new board.

**Body**

```json
{ "title": "Sprint 42 Retrospective" }
```

**Response** `201 Created`

```json
{ "id": "AwRaFe9DrTct", "title": "Sprint 42 Retrospective", "created_at": 1782501988712 }
```

Errors: `400` if `title` is missing / empty.

### `GET /api/boards`

List boards, newest first. Includes denormalized column and card counts so the home page
can render summaries without a second round-trip.

```json
[
  {
    "id": "AwRaFe9DrTct",
    "title": "Sprint 42 Retrospective",
    "created_at": 1782501988712,
    "column_count": 3,
    "card_count": 7
  }
]
```

### `GET /api/boards/:id`

Fetch a board with **all** its columns, cards, and comments — used to hydrate the board
page and to recover state after a socket reconnect.

```json
{
  "id": "AwRaFe9DrTct",
  "title": "Sprint 42 Retrospective",
  "created_at": 1782501988712,
  "columns": [
    { "id": "...", "title": "Went Well", "position": 0 }
  ],
  "cards": [
    { "id": "...", "column_id": "...", "content": "...", "author_name": "Alice", "position": 0, "created_at": 1782501999999 }
  ],
  "comments": [
    { "id": "...", "card_id": "...", "content": "+1", "author_name": "Bob", "created_at": 1782502000000 }
  ]
}
```

Errors: `404` when the board does not exist.

### `POST /api/boards/:id/columns`

Add a column to a board. Position is auto-assigned to `max(position) + 1`.

**Body**

```json
{ "title": "Shout-outs" }
```

**Response** `201 Created`

```json
{ "id": "...", "board_id": "AwRaFe9DrTct", "title": "Shout-outs", "position": 3, "created_at": 1782502100000 }
```

A `column_added` event is also broadcast to all participants in the board's room.

### `GET /api/boards/:id/export`

Stream the board's contents as CSV. The response has
`Content-Type: text/csv; charset=utf-8`, a `Content-Disposition` attachment header, and a
UTF-8 BOM (so Excel correctly detects the encoding).

Each row is one of:

- `card` — a single card
- `comment` — a comment on a card (the `Parent Card` column holds the card's content)

```csv
Board,Column,Type,Author,Content,Parent Card,Created At
Sprint 42 Retrospective,Went Well,card,Alice,"Pair programming was great",,2026-06-26T19:34:25.343Z
Sprint 42 Retrospective,Went Well,comment,Bob,"+1, let's schedule more",Pair programming was great,2026-06-26T19:34:30.000Z
```

---

## Socket.io protocol

Endpoint: `ws://<host>:3001/socket.io` (same origin as the REST API).

### Client → server events

All emits accept an optional acknowledgement callback that receives one of:

- `{ ok: true, data: ... }` on success
- `{ ok: false, error: "message", status: <number> }` on failure

#### `join_board`

```js
socket.emit('join_board', { boardId, displayName }, (ack) => { ... });
```

Joins the board's room (`board:<boardId>`) and sets the socket's display name. Future
`add_card` / `add_comment` events will be attributed to this name. Triggers a
`participants_updated` broadcast.

#### `leave_board`

```js
socket.emit('leave_board', null, (ack) => { ... });
```

Leaves the current room. Automatic on `disconnect`.

#### `add_card`

```js
socket.emit('add_card', { boardId, columnId, content }, (ack) => { ... });
```

Persists the card and broadcasts `card_added` to the room. The server uses the socket's
display name as the author.

#### `move_card`

```js
socket.emit('move_card', { boardId, cardId, toColumnId, toIndex }, (ack) => { ... });
```

Moves a card to a new column at a given index. The repository re-densifies the
`position` values for both source and destination columns. Broadcasts `card_moved`.

#### `add_comment`

```js
socket.emit('add_comment', { boardId, cardId, content }, (ack) => { ... });
```

Persists the comment, attributes it to the socket's display name, broadcasts
`comment_added`.

### Server → client events

| Event | Payload | When |
| --- | --- | --- |
| `card_added` | `{ id, column_id, content, author_name, position, created_at }` | A card was added in this board |
| `card_moved` | `{ cardId, fromColumnId, toColumnId, card, columnOrders }` | A card was moved; `columnOrders` is `{ [columnId]: [{ id, position }, ...] }` |
| `comment_added` | `{ id, card_id, content, author_name, created_at }` | A comment was added |
| `column_added` | `{ id, board_id, title, position, created_at }` | A new column was created via REST |
| `participants_updated` | `[{ socketId, name }, ...]` | Someone joined or left the room |

### Reconnect behavior

`socket.io-client` reconnects automatically. The frontend re-emits `join_board` on
every `connect` and refetches `/api/boards/:id` once reconnected, so any events missed
while offline are reconciled.
