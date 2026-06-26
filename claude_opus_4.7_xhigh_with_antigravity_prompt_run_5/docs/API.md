# API Reference

The server exposes two parallel surfaces:

1. **REST endpoints** under `/api/*` for board lifecycle and CSV export.
2. **Socket.io events** at `/socket.io` for real-time collaboration.

All entity identifiers are UUID v4 strings. Timestamps are Unix epoch
milliseconds (numbers).

---

## REST endpoints

### `GET /healthz`

Liveness probe. Returns `{ "ok": true }`.

### `GET /api/boards`

List all boards, newest first.

Response — `200 OK`:

```json
[
  {
    "id": "f0e0…",
    "title": "Sprint 42 retro",
    "created_at": 1782504174007,
    "card_count": 17
  }
]
```

### `POST /api/boards`

Create a new board. Auto-seeds three default columns
("Went Well", "Needs Improvement", "Action Items").

Request body:

```json
{ "title": "Sprint 42 retro" }
```

Response — `201 Created` (full board payload, same shape as `GET /api/boards/:id`).

Errors: `400` if `title` is missing or empty.

### `GET /api/boards/:id`

Fetch a single board with all of its columns, cards, and comments.

Response — `200 OK`:

```json
{
  "id": "f0e0…",
  "title": "Sprint 42 retro",
  "created_at": 1782504174007,
  "columns": [
    { "id": "…", "board_id": "f0e0…", "title": "Went Well", "position": 0 }
  ],
  "cards": [
    { "id": "…", "column_id": "…", "content": "Quick wins", "author_name": "Alex", "position": 0, "created_at": 1782504200000 }
  ],
  "comments": [
    { "id": "…", "card_id": "…", "content": "+1", "author_name": "Sam", "created_at": 1782504300000 }
  ]
}
```

Errors: `404` if the board does not exist.

### `POST /api/boards/:id/columns`

Add a new column to a board, appended after existing columns.

Request body:

```json
{ "title": "Kudos" }
```

Response — `201 Created`:

```json
{ "id": "…", "board_id": "f0e0…", "title": "Kudos", "position": 3 }
```

Side effect: emits `column_added` to all sockets in the `board:<id>` room.

Errors: `400` for missing title or unknown board.

### `GET /api/boards/:id/export`

Stream the board as a CSV file with one row per (card × comment) pair, plus
a row for any card without comments. Used by the "Export CSV" button.

Headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="<board-title>-<id8>.csv"
```

Columns:

| column | card_content | card_author | card_created_at | comment_content | comment_author | comment_created_at |
| ------ | ------------ | ----------- | --------------- | --------------- | -------------- | ------------------ |

Timestamps in CSV are ISO-8601. Errors: `404` if the board does not exist.

---

## Socket.io events

The client connects to the default Socket.io namespace, then joins a board
room. All cross-client updates are emitted to `board:<boardId>`. Each
client→server event accepts an acknowledgement callback:

```js
socket.emit(event, payload, (ack) => {
  if (!ack.ok) console.error(ack.error);
});
```

### Connection lifecycle

| Event           | Direction        | Payload                                    | Notes                                      |
| --------------- | ---------------- | ------------------------------------------ | ------------------------------------------ |
| `join_board`    | client → server  | `{ boardId, name }`                        | Ack: `{ ok, board }` with full state       |

The server will refuse other events until `join_board` has been called.

### Card events

| Event           | Direction        | Payload                                         |
| --------------- | ---------------- | ----------------------------------------------- |
| `add_card`      | client → server  | `{ columnId, content, authorName }`             |
| `card_added`    | server → room    | `{ card }`                                      |
| `move_card`     | client → server  | `{ cardId, toColumnId, toIndex }`               |
| `card_moved`    | server → room    | `{ card, fromColumnId, toColumnId, sourceCards, targetCards }` |

`card_moved` includes the freshly ordered cards in the source and target
columns so clients can re-sort without refetching the entire board.

### Comment events

| Event           | Direction        | Payload                                         |
| --------------- | ---------------- | ----------------------------------------------- |
| `add_comment`   | client → server  | `{ cardId, content, authorName }`               |
| `comment_added` | server → room    | `{ comment }`                                   |

### Column events

| Event           | Direction        | Payload      |
| --------------- | ---------------- | ------------ |
| `column_added`  | server → room    | `{ column }` |

Column creation goes through the REST `POST /api/boards/:id/columns`
endpoint, but the server still broadcasts `column_added` so live clients
update without a refresh.

### Error contract

Every ack uses the shape `{ ok: true, ...data }` or `{ ok: false, error: string }`.
The server validates parent-child relationships (e.g. a comment must belong
to a card in the joined board), so clients can surface friendly messages
without trusting their own state.

---

## Data model

```sql
CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE board_columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

The database uses `PRAGMA journal_mode = WAL` so reads and writes can
proceed concurrently — comfortable for the team-scale workloads this tool
targets (~10–30 concurrent users per board).
