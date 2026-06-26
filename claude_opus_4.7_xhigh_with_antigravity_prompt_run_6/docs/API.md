# API reference

Two surfaces, both served by the same Node process on `PORT` (default `4000`):

1. **REST** under `/api` — used for board/column creation, snapshot fetches, CSV export.
2. **Socket.io** under `/socket.io` — used for all real-time collaboration.

In development the Vite dev server proxies both surfaces to `localhost:4000`, so the
browser only ever talks to `http://localhost:5173`.

---

## REST endpoints

All requests/responses are JSON unless noted. Errors are returned as
`{ "error": "<message>" }` with an appropriate 4xx/5xx status.

### `GET /api/health`

Health probe.

```json
{ "ok": true, "ts": 1782506028317 }
```

### `GET /api/boards`

List all boards, newest first.

```json
{
  "boards": [
    {
      "id": "uuid",
      "title": "Sprint 42 Retro",
      "createdAt": 1782506028350,
      "cardCount": 12
    }
  ]
}
```

### `POST /api/boards`

Create a new board. Optionally pass custom columns; defaults to
`["Went Well", "Needs Improvement", "Action Items"]`.

Request body:

```json
{ "title": "Sprint 42 Retro", "columns": ["Liked", "Learned", "Lacked", "Longed For"] }
```

Response `201 Created`:

```json
{ "board": { "id": "uuid", "title": "...", "createdAt": 1782..., "columns": [ ... ] } }
```

### `GET /api/boards/:id`

Fetch the entire board snapshot (board + columns + cards + comments). Returns `404`
if the board does not exist.

```json
{
  "board": {
    "id": "uuid",
    "title": "Sprint 42 Retro",
    "createdAt": 1782506028350,
    "columns": [
      {
        "id": "uuid",
        "title": "Went Well",
        "position": 0,
        "createdAt": 1782506028350,
        "cards": [
          {
            "id": "uuid",
            "columnId": "uuid",
            "content": "Shipped the new onboarding!",
            "authorName": "Ada",
            "position": 0,
            "createdAt": 1782506030000,
            "comments": [
              {
                "id": "uuid",
                "cardId": "uuid",
                "content": "+1",
                "authorName": "Grace",
                "createdAt": 1782506031000
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### `POST /api/boards/:id/columns`

Add a new column to a board. Position is auto-assigned to the end.

Request body:

```json
{ "title": "Kudos" }
```

Response `201 Created`:

```json
{ "column": { "id": "uuid", "boardId": "uuid", "title": "Kudos", "position": 3, "createdAt": 1782..., "cards": [] } }
```

### `GET /api/boards/:id/export`

Stream a CSV file of the board's contents.

- Response headers:
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="<board-title>_<id8>.csv"`
- The CSV includes one row per (column × card × comment) combination, with rows for
  empty columns/cards so every column is represented at least once.
- Columns: `column, column_position, card_content, card_author, card_position,
  card_created_at, comment_content, comment_author, comment_created_at`.

---

## Socket.io events

Clients connect to the same origin (e.g. `io('/')`). All events use Socket.io's
acknowledgment callback to signal success/failure.

### Client → Server

| Event          | Payload                                              | Ack response                              |
|----------------|------------------------------------------------------|-------------------------------------------|
| `join_board`   | `{ boardId, name }`                                  | `{ ok: true }` or `{ ok: false, error }`  |
| `leave_board`  | _(none)_                                             | `{ ok: true }`                            |
| `add_card`     | `{ columnId, content, authorName? }`                 | `{ ok, card?, error? }`                   |
| `move_card`    | `{ cardId, toColumnId, toIndex }`                    | `{ ok, error? }`                          |
| `add_comment`  | `{ cardId, content, authorName? }`                   | `{ ok, comment?, error? }`                |

If `authorName` is omitted, the server uses the display name supplied via the most
recent `join_board`.

### Server → Client (broadcast to the board's room)

| Event              | Payload                                                                |
|--------------------|------------------------------------------------------------------------|
| `card_added`       | `{ card }`                                                             |
| `card_moved`       | `{ cardId, fromColumnId, toColumnId, toIndex }`                        |
| `comment_added`    | `{ comment }`                                                          |
| `presence_updated` | `{ boardId, count }` — number of sockets currently in the room         |

The server is the single source of truth. Clients should treat broadcasts as the
canonical state; on reconnect they refetch `GET /api/boards/:id` to reconcile.

---

## Data model (SQLite)

```sql
boards         (id TEXT PK, title TEXT, created_at INTEGER)
board_columns  (id TEXT PK, board_id FK, title TEXT, position INTEGER, created_at INTEGER)
cards          (id TEXT PK, column_id FK, content TEXT, author_name TEXT,
                position INTEGER, created_at INTEGER)
comments       (id TEXT PK, card_id FK, content TEXT, author_name TEXT, created_at INTEGER)
```

- All foreign keys cascade on delete.
- IDs are UUID v4.
- Positions are dense integers re-numbered on every move (transactional) so ordering
  is deterministic without `ROW_NUMBER()` gymnastics.
- The database is opened in WAL mode for concurrent read/write friendliness.
