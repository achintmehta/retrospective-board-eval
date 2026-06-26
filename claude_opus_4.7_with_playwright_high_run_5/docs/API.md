# API Reference

The backend exposes a small REST surface for board CRUD and CSV export, plus a Socket.io interface for real-time collaboration. All endpoints are prefixed with `/api`.

## REST

### `GET /api/health`

Liveness check. Returns `{ "ok": true }`.

### `GET /api/boards`

List all boards, newest first.

**Response 200** — `Board[]`

```json
[
  { "id": "f2c…", "title": "Sprint 23 Retro", "createdAt": 1742394018211 }
]
```

### `POST /api/boards`

Create a board. If `columnTitles` is omitted or empty, three defaults are created: *Went Well*, *Needs Improvement*, *Action Items*.

**Body**
```json
{ "title": "Sprint 23 Retro", "columnTitles": ["Liked", "Learned", "Lacked"] }
```

**Response 201** — `BoardWithColumns` (same shape as `GET /api/boards/:id`).

**Errors**
- `400 { error: "title is required" }`

### `GET /api/boards/:id`

Full board snapshot: columns, cards, and comments — already nested.

**Response 200**
```json
{
  "id": "f2c…",
  "title": "Sprint 23 Retro",
  "createdAt": 1742394018211,
  "columns": [
    {
      "id": "col-1",
      "boardId": "f2c…",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "card-1",
          "columnId": "col-1",
          "content": "Pairing helped a lot",
          "authorName": "Sam",
          "position": 0,
          "createdAt": 1742394100000,
          "comments": [
            {
              "id": "cm-1",
              "cardId": "card-1",
              "content": "+1 to this",
              "authorName": "Lee",
              "createdAt": 1742394200000
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors**
- `404 { error: "board not found" }`

### `POST /api/boards/:id/columns`

Append a column. New columns get `position = max(position) + 1`.

**Body** `{ "title": "Action Items" }`

**Response 201** — `Column` (empty `cards` array).

**Errors**
- `400 { error: "title is required" }`
- `404 { error: "board not found" }`

### `GET /api/boards/:id/export`

Streams a CSV containing one row per (card, comment) pair, plus a row per cardless column and per commentless card.

Columns:

| Field | Notes |
|-------|-------|
| `column` | Column title |
| `card_content` | Empty if the column has no cards |
| `card_author` | Display name of the card author |
| `card_created_at` | ISO 8601 |
| `comment_content` | Empty if no comments on the card |
| `comment_author` | Display name of the comment author |
| `comment_created_at` | ISO 8601 |

The response sets `Content-Disposition: attachment` with a slugified filename, so the browser downloads it on click.

**Errors**
- `404 { error: "board not found" }`

## Socket.io

Connect to the same origin as the HTTP server (Vite dev proxies `/socket.io` in dev). Once connected, all interaction is in three steps:

1. `join_board` — must be called before any other event.
2. Emit `add_card` / `move_card` / `add_comment` to mutate state.
3. Listen for `card_added` / `card_moved` / `comment_added` to apply remote changes.

All emits accept an ack callback `(response) => void` with `{ ok: true }` or `{ ok: false, error: string }`.

### Client → Server

| Event | Payload | Notes |
|-------|---------|-------|
| `join_board` | `{ boardId, displayName }` | Joins the room `boardId`. Display name is stored on the socket and used as the author for subsequent events. |
| `add_card` | `{ columnId, content }` | Server appends at the end of the column. |
| `move_card` | `{ cardId, toColumnId, toPosition }` | Server reorders positions atomically inside the column(s). |
| `add_comment` | `{ cardId, content }` | Server appends a comment to the card. |

Validation:
- `content` is trimmed; must be 1–4000 characters.
- `displayName` is trimmed; must be 1–80 characters.
- `toPosition` must be a non-negative integer.

### Server → Client (broadcasts to room)

| Event | Payload |
|-------|---------|
| `card_added` | `Card` (with empty `comments`) |
| `card_moved` | `{ cardId, fromColumnId, toColumnId, fromPosition, toPosition }` |
| `comment_added` | `Comment` |

The emitting socket also receives these broadcasts, so all clients (including the actor) apply state the same way — keeping reducers symmetric.

## Data model

```sql
boards(id, title, created_at)
board_columns(id, board_id → boards.id, title, position, created_at)
cards(id, column_id → board_columns.id, content, author_name, position, created_at)
comments(id, card_id → cards.id, content, author_name, created_at)
```

Foreign keys are `ON DELETE CASCADE`. The DB runs in WAL mode for better concurrent read/write performance.
