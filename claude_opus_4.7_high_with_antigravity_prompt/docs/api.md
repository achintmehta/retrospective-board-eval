# API Reference

The Retroflow server exposes a small REST API for board CRUD plus a Socket.io
gateway for real-time collaboration.

Base URL: `http://localhost:4000`

## REST Endpoints

All request and response bodies are JSON unless otherwise noted.

### `GET /api/health`

Liveness probe. Returns `{ "ok": true }`.

### `GET /api/boards`

Returns the list of boards, newest first.

```json
[
  { "id": "abc123", "title": "Sprint 24", "created_at": 1718932482000, "card_count": 12 }
]
```

### `POST /api/boards`

Creates a new board with a default column set
(`Went Well`, `To Improve`, `Action Items`).

Body:

```json
{ "title": "Sprint 24 — Retro" }
```

Returns `201 Created` with the full board including its columns:

```json
{
  "id": "abc123",
  "title": "Sprint 24 — Retro",
  "created_at": 1718932482000,
  "columns": [{ "id": "...", "board_id": "abc123", "title": "Went Well", "position": 1, "created_at": 1718932482000 }],
  "cards": [],
  "comments": []
}
```

Errors: `400` if `title` is missing or longer than 120 characters.

### `GET /api/boards/:id`

Returns a single board with all of its columns, cards, and comments.

```json
{
  "id": "abc123",
  "title": "Sprint 24",
  "created_at": 1718932482000,
  "columns": [ ... ],
  "cards": [ ... ],
  "comments": [ ... ]
}
```

Errors: `404` if the board does not exist.

### `POST /api/boards/:id/columns`

Creates a new column on the given board. The column is appended at the end.

Body:

```json
{ "title": "Kudos" }
```

Returns `201 Created` with the new column.

Errors: `400` for invalid title, `404` if the board does not exist.

### `GET /api/boards/:id/export`

Streams the board's full contents as a CSV file. Response headers set
`Content-Type: text/csv; charset=utf-8` and a `Content-Disposition` attachment
filename. Each card produces one row per comment; cards with no comments produce
a single row with empty comment columns.

CSV columns:

```
column, card_content, card_author, card_created_at,
comment_content, comment_author, comment_created_at
```

Errors: `404` if the board does not exist.

## Socket.io Events

Connect with `socket.io-client` to the same origin (path: default `/socket.io`).

### Client → Server

| Event         | Payload                                                  | Ack response                          |
| ------------- | -------------------------------------------------------- | ------------------------------------- |
| `join_board`  | `{ boardId, displayName }`                               | `{ ok: true, board }` or error        |
| `add_card`    | `{ columnId, content }`                                  | `{ ok: true, card }` or error         |
| `move_card`   | `{ cardId, targetColumnId, targetIndex }`                | `{ ok: true }` or error               |
| `add_comment` | `{ cardId, content }`                                    | `{ ok: true, comment }` or error      |

A socket must `join_board` before it can emit other events. The server uses the
display name supplied to `join_board` as the author of all subsequent writes.

### Server → Clients (broadcast to the board room)

| Event          | Payload                                       |
| -------------- | --------------------------------------------- |
| `card_added`   | `{ card }`                                    |
| `card_moved`   | `{ card, fromColumnId, toColumnId }`          |
| `comment_added`| `{ comment }`                                 |

## Data Model

```
Board       (id, title, created_at)
BoardColumn (id, board_id, title, position, created_at)
Card        (id, column_id, content, author_name, position, created_at)
Comment     (id, card_id, content, author_name, created_at)
```

All timestamps are Unix epoch milliseconds.
