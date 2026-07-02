# API Reference

All REST endpoints are under `/api`. All Socket.io events are namespaced on the
default namespace (`/`). Board rooms are named `board:<boardId>`.

## REST

### `POST /api/boards`
Create a new board. Automatically seeds three default columns.

Request body:
```json
{ "title": "Sprint 42 retro" }
```

Response `201`:
```json
{
  "id": "aB3xYz9nQ2eK",
  "title": "Sprint 42 retro",
  "created_at": 1719878400000,
  "columns": [
    { "id": "…", "title": "Went Well", "position": 0, "color": "#22c55e", "cards": [] }
  ]
}
```

Errors:
- `400 { "error": "title is required" }`
- `400 { "error": "title too long (max 120)" }`

### `GET /api/boards`
List all boards, newest first. Includes a `cardCount` per board.

Response:
```json
[
  { "id": "…", "title": "…", "created_at": 1719878400000, "cardCount": 12 }
]
```

### `GET /api/boards/:id`
Fetch a single board with nested columns → cards → comments.

Errors:
- `404 { "error": "board not found" }`

### `POST /api/boards/:id/columns`
Add a new column to a board. Broadcasts `column_added` to the board room.

Request body:
```json
{ "title": "Kudos", "color": "#f472b6" }
```

Errors:
- `400 { "error": "title is required" }`
- `404 { "error": "board not found" }`

### `GET /api/boards/:id/export`
Streams a CSV of every card and comment on the board. Columns:
`Column, Card, Card Author, Card Created At, Comment, Comment Author, Comment Created At`.

Timestamps are ISO 8601.

## Socket.io Events

Clients connect via `io()` (the same host as the API). All state-changing events
accept an optional acknowledgement callback: `ack({ ok: true })` or
`ack({ error: "…" })`.

### Client → Server

| Event         | Payload                                                                | Notes                                             |
| ------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| `join_board`  | `{ boardId, displayName }`                                             | Required before any other event                   |
| `add_card`    | `{ columnId, content }`                                                | Server stamps `author_name` from the session      |
| `move_card`   | `{ cardId, toColumnId, toPosition }`                                   | Server resolves position clashes in a transaction |
| `add_comment` | `{ cardId, content }`                                                  | Server stamps `author_name` from the session      |

### Server → Client (broadcast to `board:<id>`)

| Event             | Payload                                                                                             |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| `card_added`      | `{ card: { id, column_id, content, author_name, position, created_at, comments: [] } }`             |
| `card_moved`      | `{ cardId, fromColumnId, toColumnId, toPosition }`                                                  |
| `comment_added`   | `{ comment: { id, card_id, content, author_name, created_at } }`                                    |
| `column_added`    | `{ column: { id, board_id, title, position, color, cards: [] } }`                                   |
| `presence_joined` | `{ name }`                                                                                          |
| `presence_left`   | `{ name }`                                                                                          |

## Data Model (SQLite)

```
boards          (id TEXT PK, title, created_at)
board_columns   (id TEXT PK, board_id FK, title, position, color)
cards           (id TEXT PK, column_id FK, content, author_name, position, created_at)
comments        (id TEXT PK, card_id FK, content, author_name, created_at)
```

Foreign keys are enforced (`PRAGMA foreign_keys = ON`) and deletes cascade.
WAL mode is enabled for better concurrency on team-scale writes.
