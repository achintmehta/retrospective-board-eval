# API Reference

The backend exposes a small REST surface for board/column creation and reads,
plus a Socket.io channel for everything that needs to be real-time (cards,
moves, comments). All endpoints live under the `/api` prefix and accept/return
JSON unless noted.

## Conventions

- All `id` fields are UUID v4 strings.
- Timestamps are ISO-8601 strings in UTC (e.g. `2026-06-26T13:45:00.123Z`).
- Errors come back as `{ "error": "<message>" }` with a non-2xx status.

---

## REST endpoints

### `GET /api/health`

Liveness probe. Returns `{ ok: true, env: "production"|"development" }`.

---

### `POST /api/boards`

Create a new board.

**Body**
```json
{ "title": "Sprint 42 retro", "seedDefaults": true }
```

- `title` (string, required, 1–200 chars) — board name.
- `seedDefaults` (boolean, optional, default `true`) — when true, the board is
  pre-populated with three columns: "Went Well", "Needs Improvement",
  "Action Items".

**Response** `201 Created` — full board payload (see `GET /api/boards/:id`).

---

### `GET /api/boards`

List all boards, newest first.

**Response** `200 OK`
```json
[
  {
    "id": "…",
    "title": "Sprint 42 retro",
    "created_at": "2026-06-26T13:45:00.000Z",
    "card_count": 7
  }
]
```

---

### `GET /api/boards/:id`

Fetch a single board with all its columns, cards and comments.

**Response** `200 OK`
```json
{
  "id": "…",
  "title": "Sprint 42 retro",
  "created_at": "…",
  "columns": [
    { "id": "…", "board_id": "…", "title": "Went Well", "position": 0, "created_at": "…" }
  ],
  "cards": [
    {
      "id": "…",
      "column_id": "…",
      "content": "Deploys were quick.",
      "author_name": "Sam",
      "position": 0,
      "created_at": "…"
    }
  ],
  "comments": [
    {
      "id": "…",
      "card_id": "…",
      "content": "Agreed — pipeline tweaks paid off.",
      "author_name": "Pat",
      "created_at": "…"
    }
  ]
}
```

Returns `404` if the board does not exist.

---

### `POST /api/boards/:id/columns`

Add a column to a board.

**Body**
```json
{ "title": "Kudos" }
```

- `title` (string, required, 1–100 chars).

**Response** `201 Created` with the new column object. The server also
broadcasts a `column_added` event to everyone in the board room.

---

### `GET /api/boards/:id/export`

Download the board as CSV.

**Response** `200 OK` — `Content-Type: text/csv` with a
`Content-Disposition: attachment` header. The CSV contains one header row plus
one row per card and one per comment, grouped by column:

```
type,column,card_content,card_author,card_created_at,comment_content,comment_author,comment_created_at
card,Went Well,Deploys were quick.,Sam,2026-06-26T…,,,
comment,Went Well,Deploys were quick.,Sam,2026-06-26T…,Agreed,Pat,2026-06-26T…
```

Columns with no cards still produce a row (with `type=column`) so the export
captures column structure even when empty.

---

## Socket.io events

Clients connect at the standard `/socket.io` path. The same Express server hosts
the Socket.io endpoint, so the dev proxy and production deployment "just work"
on a single origin.

All events that mutate data use **acknowledgement callbacks** of the form
`{ ok: boolean, error?: string, ...payload }`.

### Client → server

#### `join_board`

```js
socket.emit('join_board', { boardId, displayName }, (ack) => { /* ack.board */ });
```

The server validates the board exists, joins the socket to the room
`board:<id>`, stamps the socket with the display name (used as the author for
subsequent cards/comments), and returns the current full board state in
`ack.board`. Clients should call this on (re)connect.

#### `leave_board`

```js
socket.emit('leave_board', null, (ack) => { /* ack.ok */ });
```

Removes the socket from the current board room.

#### `add_card`

```js
socket.emit('add_card', { columnId, content }, (ack) => { /* ack.card */ });
```

Creates a card in the given column with `author_name` set from the joined
display name. Server broadcasts `card_added` to the room (including the
emitter, so all clients converge on the same state).

#### `move_card`

```js
socket.emit('move_card', { cardId, toColumnId, toIndex }, (ack) => {});
```

Moves a card. Positions are dense integers within each column and are
renumbered transactionally to avoid drift across many moves. Server
broadcasts `card_moved`.

#### `add_comment`

```js
socket.emit('add_comment', { cardId, content }, (ack) => { /* ack.comment */ });
```

Adds a comment under a card. Server broadcasts `comment_added`.

### Server → client

| Event           | Payload                                                                 |
|-----------------|-------------------------------------------------------------------------|
| `card_added`    | The full card object.                                                   |
| `card_moved`    | `{ cardId, fromColumnId, toColumnId, position }`.                       |
| `comment_added` | The full comment object.                                                |
| `column_added`  | The full column object (emitted when a column is created via REST).     |
| `presence_join` | `{ socketId, displayName }`.                                            |
| `presence_leave`| `{ socketId, displayName }`.                                            |

### Validation and errors

- All text fields are trimmed and capped (card/comment content at 2000 chars,
  display name at 80 chars). Empty strings after trim are rejected.
- The server enforces that the supplied `columnId` / `cardId` belong to the
  board the socket has joined; mismatches fail with `ack.error`.
- On a socket disconnect/reconnect, the client re-emits `join_board` and
  receives the latest board state in the ack so that any events it missed are
  reflected immediately.
