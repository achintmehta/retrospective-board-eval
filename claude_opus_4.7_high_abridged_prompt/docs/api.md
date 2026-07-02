# API Reference

All endpoints are served under the `/api` prefix. Realtime events run through
the Socket.io connection at the site origin.

## REST

### `POST /api/boards`

Create a new board. A new board is seeded with three default columns:
_Went Well_, _Needs Improvement_, and _Action Items_.

**Body**

```json
{ "title": "Sprint 42" }
```

**Response 201**

```json
{
  "id": "…uuid…",
  "title": "Sprint 42",
  "created_at": 1719800000000
}
```

**Errors**: `400` if title is empty or > 120 chars.

---

### `GET /api/boards`

List all boards, newest first.

**Response 200**

```json
[
  { "id": "…", "title": "Sprint 42", "created_at": 1719800000000 }
]
```

---

### `GET /api/boards/:id`

Fetch a board with all its columns, cards, and comments.

**Response 200**

```json
{
  "id": "…",
  "title": "Sprint 42",
  "created_at": 1719800000000,
  "columns": [
    { "id": "…", "board_id": "…", "title": "Went Well", "position": 0, "created_at": 1719800000000 }
  ],
  "cards": [
    { "id": "…", "column_id": "…", "content": "Shipping cadence improved", "author_name": "Alex", "position": 0, "created_at": 1719800100000 }
  ],
  "comments": [
    { "id": "…", "card_id": "…", "content": "Agreed 👍", "author_name": "Sam", "created_at": 1719800200000 }
  ]
}
```

**Errors**: `404` if the board does not exist.

---

### `POST /api/boards/:id/columns`

Create a new column at the end of the board. The new column is broadcast to all
connected clients via the `column_added` socket event.

**Body**

```json
{ "title": "Kudos" }
```

**Response 201**

```json
{
  "id": "…",
  "board_id": "…",
  "title": "Kudos",
  "position": 3,
  "created_at": 1719800300000
}
```

**Errors**: `400` if title is empty or > 60 chars; `404` if board not found.

---

### `GET /api/boards/:id/export`

Stream the board as CSV. One row per (column × card × comment); cards without
comments get a single row with empty comment fields; empty columns get a single
row with empty card/comment fields.

Response headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="retro-<slug>.csv"
```

Columns:
`board_title, column, card_content, card_author, card_created_at, comment_content, comment_author, comment_created_at`

---

### `GET /api/health`

Liveness probe. Returns `{ "ok": true }`.

## WebSocket (Socket.io)

Clients connect to the site origin (no separate namespace). All events use an
optional `ack` callback of the shape `{ ok: boolean, error?: string, … }`.

### Client → Server

| Event         | Payload                                             | Notes |
|---------------|-----------------------------------------------------|-------|
| `join_board`  | `{ boardId, name }`                                 | Joins the `board:<id>` room; sets display name for this socket. |
| `add_card`    | `{ columnId, content }`                             | Persists a card and broadcasts `card_added`. |
| `move_card`   | `{ cardId, toColumnId, toPosition }`                | Reorders cards; broadcasts `card_moved`. |
| `add_comment` | `{ cardId, content }`                               | Persists a comment and broadcasts `comment_added`. |

Content strings must be non-empty and ≤ 2000 characters. Display names are
truncated to 40 characters. All events are best-effort — the ack callback
returns an error message if validation fails.

### Server → Client (room-broadcast)

| Event           | Payload                    |
|-----------------|----------------------------|
| `card_added`    | `Card`                     |
| `card_moved`    | `{ card, fromColumnId, toColumnId, toPosition }` |
| `comment_added` | `Comment`                  |
| `column_added`  | `BoardColumn`              |

## Data model

```
Board          { id, title, created_at }
BoardColumn    { id, board_id, title, position, created_at }
Card           { id, column_id, content, author_name, position, created_at }
Comment        { id, card_id, content, author_name, created_at }
```

Positions are 0-indexed integers, compacted on move (no gaps). Timestamps are
milliseconds since epoch. IDs are v4 UUIDs. The server is the source of truth
for positions and reconciles on move.
