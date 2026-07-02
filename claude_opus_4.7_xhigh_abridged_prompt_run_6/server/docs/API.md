# API Reference

All requests and responses use JSON unless otherwise stated. The server accepts CORS from any
origin (this app is intended to run inside a trusted network).

## REST

Base path: `/api`

### `GET /api/health`

Health check.

**Response 200**
```json
{ "ok": true, "time": 1723852800000 }
```

### `GET /api/boards`

List every board, newest first, with a card count.

**Response 200**
```json
[
  {
    "id": "abc123def456",
    "title": "Sprint 42 Retro",
    "created_at": 1723852800000,
    "card_count": 12
  }
]
```

### `POST /api/boards`

Create a new board. Three default columns (`Went Well`, `Needs Improvement`,
`Action Items`) are seeded automatically.

**Body**
```json
{ "title": "Sprint 42 Retro" }
```

**Response 201**
```json
{ "id": "abc123def456", "title": "Sprint 42 Retro", "created_at": 1723852800000 }
```

**Errors** — `400` if title is missing or > 120 chars.

### `GET /api/boards/:id`

Full board, including columns, cards, and comments.

**Response 200**
```json
{
  "id": "abc123",
  "title": "Sprint 42 Retro",
  "created_at": 1723852800000,
  "columns": [
    {
      "id": "col_1",
      "board_id": "abc123",
      "title": "Went Well",
      "position": 0,
      "accent": "emerald",
      "cards": [
        {
          "id": "card_1",
          "column_id": "col_1",
          "content": "We shipped early.",
          "author_name": "Priya",
          "position": 0,
          "created_at": 1723853000000,
          "comments": [
            {
              "id": "cmt_1",
              "card_id": "card_1",
              "content": "Nice!",
              "author_name": "Alex",
              "created_at": 1723853060000
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors** — `404` if the board doesn't exist.

### `POST /api/boards/:id/columns`

Append a new column to a board. Broadcasts `column_added` to the board room.

**Body**
```json
{ "title": "Kudos", "accent": "sky" }
```

Valid accents: `emerald`, `rose`, `amber`, `violet`, `sky`, `fuchsia`.

**Response 201** — the created column (empty `cards`).

### `POST /api/columns/:id/cards`

REST fallback for adding a card without a WebSocket. Prefer the socket event during normal use.

**Body**
```json
{ "content": "Standups ran long", "author_name": "Priya" }
```

### `POST /api/cards/:id/comments`

REST fallback for adding a comment.

### `GET /api/boards/:id/export`

Stream a CSV of the entire board.

Response has `Content-Type: text/csv` and `Content-Disposition: attachment`. Columns:

```
board_title, column, card_content, card_author, card_created_at,
comment_content, comment_author, comment_created_at
```

Each card produces one row per comment (or a single row with empty comment fields if no
comments exist). Empty columns produce a placeholder row so structure is preserved.

## Socket.io

Namespace: default (`/`).

Every real-time interaction happens after joining a board room via `join_board`. All events
use an optional acknowledgement callback:

```ts
type Ack<T> = (payload: { ok: true; data?: T } | { ok: false; error: string }) => void;
```

### Client → server

| Event         | Payload                                                                                          | Description                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `join_board`  | `boardId: string`                                                                                | Join the room for that board. Fails if the board doesn't exist.                    |
| `leave_board` | `boardId: string`                                                                                | Leave the room. No ack.                                                            |
| `add_card`    | `{ board_id, column_id, content, author_name }`                                                  | Persist a card and broadcast `card_added`. Rejects if the column is not on `board_id`. |
| `move_card`   | `{ board_id, card_id, to_column_id, to_position }`                                               | Move a card. Positions in the source and target columns are re-numbered.           |
| `add_comment` | `{ board_id, card_id, content, author_name }`                                                    | Add a comment and broadcast `comment_added`.                                       |

### Server → client (broadcast to room)

| Event           | Payload                                          | When                                                        |
| --------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `card_added`    | `{ board_id, card }`                             | After a successful `add_card`.                              |
| `card_moved`    | `{ board_id, card }`                             | After a successful `move_card`. `card` has the new `column_id`/`position`. |
| `comment_added` | `{ board_id, comment }`                          | After a successful `add_comment`.                           |
| `column_added`  | `{ board_id, column }`                           | After `POST /api/boards/:id/columns` succeeds.              |

### Reliability model

- The server is the single source of truth. Clients apply optimistic updates but reconcile
  from `card_moved` broadcasts.
- On reconnect, the client re-fetches the entire board via `GET /api/boards/:id` and
  re-emits `join_board`.
- SQLite runs in WAL mode; this is safe for the small-team concurrency this tool targets.
