# API Reference

The server exposes a small REST surface for board creation, retrieval, and CSV export,
plus a Socket.io channel for all real-time collaboration events. Everything runs on the
same port (default `3001`).

## Base URL

- Development: `http://localhost:3001` (Vite dev server on `:5173` proxies `/api` and
  `/socket.io` here)
- Production / Docker: whatever port you expose (default `3001`)

## Data model

```jsonc
Board:      { id, title, created_at, columns[] }
Column:     { id, board_id, title, color, position, created_at, cards[] }
Card:       { id, column_id, content, author_name, position, created_at, comments[] }
Comment:    { id, card_id, content, author_name, created_at }
```

Timestamps (`created_at`) are epoch milliseconds. Colors are string keys mapped to
gradient presets on the frontend (`success`, `warning`, `danger`, `accent`, `info`).

## REST endpoints

### `GET /api/health`

Simple health check.

**Response** `200 OK`
```json
{ "ok": true, "ts": 1782948284820 }
```

### `POST /api/boards`

Create a new board. Three default columns are added automatically.

**Body**
```json
{ "title": "Sprint 42 Retro" }
```

**Response** `201 Created`
```json
{ "board": { "id": "...", "title": "...", "created_at": ..., "columns": [ ... ] } }
```

Errors: `400` if `title` is missing or too long (>120 chars).

### `GET /api/boards`

List all boards, newest first.

**Response** `200 OK`
```json
{ "boards": [ { "id", "title", "created_at", "card_count" }, ... ] }
```

### `GET /api/boards/:id`

Get a board with all columns, cards, and nested comments hydrated.

**Response** `200 OK`
```json
{ "board": { "id", "title", "created_at", "columns": [ { "cards": [ { "comments": [...] } ] } ] } }
```

Errors: `404` if the board doesn't exist.

### `POST /api/boards/:id/columns`

Add a new column to a board. Broadcasts `column_added` to that board's Socket.io room.

**Body**
```json
{ "title": "Action items", "color": "accent" }
```

`color` is optional (default `"accent"`). Valid keys: `success`, `warning`, `danger`,
`accent`, `info`.

**Response** `201 Created` — `{ "column": {...} }`

### `GET /api/boards/:id/export`

Download a CSV of every card and comment on the board.

**Response** `200 OK` with `Content-Type: text/csv; charset=utf-8` and
`Content-Disposition: attachment; filename="<board-title>.csv"`.

CSV columns:
```
column, card, card_author, card_created_at, comment, comment_author, comment_created_at
```

Cards without comments appear as one row with empty comment fields; cards with N
comments produce N rows (one per comment). Timestamps are ISO-8601 UTC.

## Socket.io channel

Clients connect to the default namespace (`/`). Each board has its own room named
`board:<boardId>`.

### Client → server events

Every event takes an ACK callback of the form `(ack) => { ok, ...data }`. On error,
`ack = { ok: false, error: "message" }`.

#### `join_board`
Payload: `{ boardId, displayName }`

Joins the socket to `board:<boardId>` and stores the display name on the connection.
Responds with the full board on success:

```json
{ "ok": true, "board": { ... } }
```

Emits `user_joined` to the rest of the room and `presence_update` (with `count`) to
everyone in it, including the joiner.

#### `add_card`
Payload: `{ columnId, content }`

Requires an earlier `join_board`. Persists the card and broadcasts:

Server → room: `card_added`
```json
{ "card": { "id", "column_id", "content", "author_name", "position", "created_at", "comments": [] } }
```

#### `move_card`
Payload: `{ cardId, toColumnId, toPosition }`

Moves a card to a new column and position (0-based). Bumps subsequent cards in the target
column and renormalizes positions in both source and target columns.

Server → room: `card_moved`
```json
{ "cardId", "fromColumnId", "toColumnId", "toPosition", "movedBy" }
```

#### `add_comment`
Payload: `{ cardId, content }`

Server → room: `comment_added`
```json
{ "comment": { "id", "card_id", "content", "author_name", "created_at" } }
```

### Server → client events

| Event             | Payload                                                                | Sent when                                     |
| ----------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| `card_added`      | `{ card }`                                                             | Any client adds a card via `add_card`         |
| `card_moved`      | `{ cardId, fromColumnId, toColumnId, toPosition, movedBy }`            | Any client moves a card via `move_card`       |
| `comment_added`   | `{ comment }`                                                          | Any client adds a comment via `add_comment`   |
| `column_added`    | `{ column }`                                                           | A column is created via `POST /columns`       |
| `presence_update` | `{ count }`                                                            | Someone joins or leaves the room              |
| `user_joined`     | `{ displayName }`                                                      | Someone else joins the room                   |
| `user_left`       | `{ displayName }`                                                      | Someone else disconnects from the room        |

### Reconnection

`socket.io-client` reconnects automatically. The frontend re-emits `join_board` on
every reconnect and replaces its local board state with whatever the server returns —
this trivially reconciles anything missed while disconnected.

## Errors and limits

- Titles: max 120 chars. Column titles: max 60. Cards / comments: max 2000. Display
  name: trimmed to 40 chars, default `Anonymous`.
- Request body limit: 256 KB.
- No rate limiting is applied — this is designed for trusted intra-team use.
