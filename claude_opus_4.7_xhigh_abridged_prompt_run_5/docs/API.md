# API Reference

The server exposes a small REST API for board CRUD + CSV export, and a Socket.io channel for
real-time collaboration events. Everything lives on the same port (default `4000`).

- **REST base path:** `/api`
- **Socket.io path:** `/socket.io/`

There is no authentication — the app relies on guest sessions where users pick a display
name in the browser and stamp it onto every action they emit.

---

## Data model

```
Board       { id, title, created_at }
Column      { id, board_id, title, position, created_at }
Card        { id, column_id, content, author_name, position, created_at }
Comment     { id, card_id, content, author_name, created_at }
```

- `id`s are 12-char nanoids.
- `created_at` values are Unix epoch **milliseconds**.
- `position` is a 0-based integer used for ordering within its parent.

The aggregate `BoardDetail` shape returned by `GET /api/boards/:id` nests columns → cards →
comments in ordered arrays.

---

## REST endpoints

### `POST /api/boards`

Create a new board. Auto-seeds three default columns: *Went Well*, *Needs Improvement*,
*Action Items*.

**Body**

```json
{ "title": "Sprint 42 Retro" }
```

**Response** — `201 Created`

```json
{ "id": "b8xW2p...", "title": "Sprint 42 Retro", "created_at": 1735660000000 }
```

**Errors:** `400 { "error": "title is required" }` when title is empty; `400` when >120 chars.

### `GET /api/boards`

Return every board, most-recently-created first.

**Response** — `200 OK`

```json
[
  { "id": "b8xW2p...", "title": "Sprint 42 Retro", "created_at": 1735660000000 }
]
```

### `GET /api/boards/:id`

Return the full nested `BoardDetail`.

**Response** — `200 OK`

```json
{
  "id": "b8xW2p...",
  "title": "Sprint 42 Retro",
  "created_at": 1735660000000,
  "columns": [
    {
      "id": "c...",
      "board_id": "b8xW2p...",
      "title": "Went Well",
      "position": 0,
      "created_at": 1735660000000,
      "cards": [
        {
          "id": "cd...",
          "column_id": "c...",
          "content": "Shipped the new feature",
          "author_name": "Alex",
          "position": 0,
          "created_at": 1735660100000,
          "comments": [
            {
              "id": "cm...",
              "card_id": "cd...",
              "content": "Nice one!",
              "author_name": "Sam",
              "created_at": 1735660200000
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors:** `404 { "error": "board not found" }`.

### `POST /api/boards/:id/columns`

Add a new column at the end.

**Body**

```json
{ "title": "Kudos" }
```

**Response** — `201 Created` returning the new `Column`.

**Errors:** `400` on bad title, `404` on unknown board.

### `GET /api/boards/:id/columns`

Return the columns for a board (without cards).

### `GET /api/boards/:id/export`

Stream a CSV file containing every card and comment on the board.

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="board-<slug>-<id>.csv"`

**Columns:** `type,column,card_content,card_author,comment_content,comment_author,created_at`.

- `type` is `card` or `comment`.
- Cards come first (ordered by column position, then card position), followed by comments
  (ordered by creation time).
- All fields are properly CSV-escaped.

---

## Socket.io channel

Clients connect to the default path (`/socket.io`). All events are scoped to a board *room*
named `board:<boardId>`; the server broadcasts every mutation to that room.

### Client → server

Each event accepts an optional acknowledgement callback whose argument is:

```ts
{ ok: true, ...result } | { ok: false, error: string }
```

| Event         | Payload                                                                          | On success                     |
| ------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| `join_board`  | `{ boardId }`                                                                    | Joins the board's room         |
| `leave_board` | `{ boardId }`                                                                    | Leaves the board's room        |
| `add_card`    | `{ boardId, columnId, content, authorName }`                                     | Broadcasts `card_added`        |
| `move_card`   | `{ boardId, cardId, targetColumnId, targetPosition }` (`targetPosition` may be `null` to append) | Broadcasts `card_moved`        |
| `add_comment` | `{ boardId, cardId, content, authorName }`                                       | Broadcasts `comment_added`     |
| `add_column`  | `{ boardId, title }`                                                             | Broadcasts `column_added`      |

Server validation:

- `content` and `authorName` are trimmed; empty strings are rejected.
- `content` is capped at 500 chars, `authorName`/`title` at 60.
- Missing referenced ids return `{ ok: false, error: '... not found' }`.

### Server → client (broadcasts to `board:<boardId>`)

| Event           | Payload                    |
| --------------- | -------------------------- |
| `card_added`    | `{ boardId, card }`        |
| `card_moved`    | `{ boardId, card }`        |
| `comment_added` | `{ boardId, comment }`     |
| `column_added`  | `{ boardId, column }`      |

The `card` / `comment` / `column` payloads are the canonical rows as stored in SQLite
(including server-assigned `id`, `position`, and `created_at`).

### Reconnection

Socket.io reconnects automatically. On `connect`, the client re-joins the room and refetches
the full board via `GET /api/boards/:id` to reconcile any events missed during downtime.

---

## Health check

```
GET /health  ->  { "ok": true }
```
