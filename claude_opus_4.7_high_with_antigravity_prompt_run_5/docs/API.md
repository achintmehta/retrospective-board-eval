# API Reference

The backend exposes two surfaces:

1. **REST** (`/api/*`) — board lifecycle, CSV export, column creation.
2. **Socket.io** (`/socket.io`) — real-time card/comment/column mutations and presence.

Both are served by the same Node process (`server/index.js`) on `PORT` (default `4000`).

---

## REST endpoints

All endpoints return JSON (except `/export`, which returns CSV). All bodies are JSON.

### `GET /api/health`
Returns `{ "ok": true }`. Useful as a liveness check.

### `GET /api/boards`
List every board, newest first.

**Response 200**
```json
[
  {
    "id": "k7m2x8r4qn3p",
    "title": "Sprint 24 Retrospective",
    "created_at": 1719331200000,
    "column_count": 3,
    "card_count": 12
  }
]
```

### `POST /api/boards`
Create a board. A new board is seeded with three default columns:
`Went Well`, `Needs Improvement`, `Action Items`.

**Body**
```json
{ "title": "Sprint 24 Retrospective" }
```

**Response 201** — Same shape as `GET /api/boards/:id`.

**Errors** — `400` if `title` is empty or longer than 120 chars.

### `GET /api/boards/:id`
Fetch a board with its columns, cards, and comments nested.

**Response 200**
```json
{
  "id": "k7m2x8r4qn3p",
  "title": "Sprint 24",
  "created_at": 1719331200000,
  "columns": [
    {
      "id": "c1...",
      "title": "Went Well",
      "position": 0,
      "color": "emerald",
      "cards": [
        {
          "id": "card1...",
          "column_id": "c1...",
          "content": "Pairing sessions",
          "author_name": "Alex",
          "position": 0,
          "created_at": 1719331260000,
          "comments": [
            {
              "id": "cm1...",
              "card_id": "card1...",
              "content": "+1 from me",
              "author_name": "Sam",
              "created_at": 1719331300000
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors** — `404` if no board with that id exists.

### `POST /api/boards/:id/columns`
Add a column to a board. Used by the "Add column" tile on the board page.

**Body**
```json
{ "title": "Kudos", "color": "pink" }
```
`color` is optional; defaults to `violet`. Suggested values: `emerald`, `amber`, `violet`, `cyan`, `pink`.

**Response 201**
```json
{ "id": "...", "board_id": "...", "title": "Kudos", "position": 3, "color": "pink" }
```

### `GET /api/boards/:id/export`
Stream the entire board as CSV. Each row is a `(column × card × comment)` join; cards with no comments produce a single row with empty comment fields. Columns:

```
board_title, column_title, card_content, card_author, card_created_at,
comment_content, comment_author, comment_created_at
```

Timestamps are emitted as ISO-8601 strings. The response sets
`Content-Disposition: attachment; filename="<safe-title>_<board-id>.csv"`.

---

## Socket.io events

Connect to the same origin that serves the REST API. The client should
emit `join_board` immediately after connecting.

### Client → server

| Event         | Payload                                                          | Ack |
| ------------- | ---------------------------------------------------------------- | --- |
| `join_board`  | `{ boardId, displayName }`                                       | `{ ok, board }` or `{ error }` |
| `add_card`    | `{ columnId, content }`                                          | `{ ok, card }` or `{ error }` |
| `move_card`   | `{ cardId, toColumnId, toIndex }`                                | `{ ok }` or `{ error }` |
| `add_comment` | `{ cardId, content }`                                            | `{ ok, comment }` or `{ error }` |
| `add_column`  | `{ boardId, title, color? }`                                     | `{ ok, column }` or `{ error }` |

The `displayName` from `join_board` is attached to the socket and used as
`author_name` for every subsequent `add_card`/`add_comment` on that connection.

### Server → client (broadcast to room `board:<id>`)

| Event             | Payload                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `card_added`      | `{ card }` — full card object with empty `comments` array        |
| `card_moved`      | `{ cardId, fromColumnId, toColumnId, toIndex, boardId }`         |
| `comment_added`   | `{ comment }`                                                    |
| `column_added`    | `{ column }` — column with empty `cards` array                   |
| `presence_update` | `{ count }` — number of connections in the room                  |

### Server is the source of truth

Every mutation is written to SQLite inside the event handler before the
broadcast goes out. Clients perform optimistic UI updates for snappy
feedback (especially for drag-and-drop), then reconcile against the
canonical broadcast.

### Reconnect behaviour

`socket.io-client` retries automatically. After a successful reconnect
the client re-emits `join_board`, which returns the full current board
state — so any mutations that arrived during the disconnect are picked
up without manual refresh.

---

## Data model

```
boards          (id, title, created_at)
board_columns   (id, board_id → boards, title, position, color)
cards           (id, column_id → board_columns, content, author_name,
                  position, created_at)
comments        (id, card_id → cards, content, author_name, created_at)
```

Foreign keys cascade on delete. The database uses WAL journal mode for
concurrent reads while the server writes.
