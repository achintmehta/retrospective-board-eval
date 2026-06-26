# API Reference

All HTTP endpoints are mounted under `/api`. Realtime traffic uses Socket.io
on the same origin (default port `4000`).

## Conventions

- Request bodies and JSON responses use UTF-8 JSON.
- Timestamps are SQLite `datetime('now')` values (UTC) — `YYYY-MM-DD HH:MM:SS`.
- IDs are RFC 4122 v4 UUIDs.
- Errors return `{ "error": "<message>" }` with an appropriate HTTP status.

---

## REST

### `GET /api/boards`

List all boards (most recent first).

**200 OK**

```json
[
  {
    "id": "8c2f…",
    "title": "Sprint 24 retro",
    "created_at": "2026-06-25 14:02:11",
    "card_count": 12
  }
]
```

### `POST /api/boards`

Create a new board. The server seeds three default columns: "Went Well",
"Needs Improvement", "Action Items".

**Body**

```json
{ "title": "Sprint 24 retro" }
```

**201 Created** — returns the board summary `{ id, title, created_at }`.

Errors: `400` if `title` is missing/blank.

### `GET /api/boards/:id`

Fetch the full board: columns with cards, and cards with comments.

**200 OK**

```json
{
  "id": "8c2f…",
  "title": "Sprint 24 retro",
  "created_at": "2026-06-25 14:02:11",
  "columns": [
    {
      "id": "…",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "…",
          "column_id": "…",
          "content": "Pairing on the auth refactor",
          "author_name": "Achint",
          "position": 0,
          "created_at": "2026-06-25 14:04:30",
          "comments": [
            {
              "id": "…",
              "card_id": "…",
              "content": "+1, we should keep doing that",
              "author_name": "Sam",
              "created_at": "2026-06-25 14:05:01"
            }
          ]
        }
      ]
    }
  ]
}
```

Errors: `404` if the board does not exist.

### `POST /api/boards/:id/columns`

Add a column to a board. Appended to the end (`position = MAX + 1`).

**Body**

```json
{ "title": "Kudos" }
```

**201 Created** — returns `{ id, board_id, title, position }`.

Errors: `400` if `title` is missing, `404` if board not found.

### `GET /api/boards/:id/export`

Stream the board as CSV.

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="<title>-<id8>.csv"`

CSV columns:

| Column      | Notes                                   |
| ----------- | --------------------------------------- |
| `Type`      | `card` or `comment`                     |
| `Column`    | Column title                            |
| `Card`      | First 8 chars of the card UUID          |
| `Author`    | `author_name` of the card/comment       |
| `CreatedAt` | UTC timestamp                           |
| `Content`   | Free text (commas/quotes/newlines safe) |

---

## WebSocket (Socket.io)

The Socket.io endpoint shares the same port as the HTTP server. Each board
is a Socket.io room keyed by the board ID. Clients must first emit
`join_board` to receive events for that board.

All event payloads are JSON; the third (optional) callback receives
`{ ok: true, … }` or `{ ok: false, error }`.

### `join_board`

Client → server.

```json
{ "boardId": "8c2f…", "displayName": "Achint" }
```

The server joins the socket to the board room, stores the display name on the
socket session, and broadcasts a `presence_join` event to other clients.

### `add_card`

Client → server.

```json
{ "boardId": "…", "columnId": "…", "content": "Pairing went well" }
```

On success the server inserts the card and broadcasts `card_added` to the
entire board room (including the sender).

### `move_card`

Client → server.

```json
{ "boardId": "…", "cardId": "…", "toColumnId": "…", "toPosition": 2 }
```

Positions are dense `0..N-1`. The server transactionally re-numbers the
source and destination columns, then broadcasts `card_moved`.

### `add_comment`

Client → server.

```json
{ "boardId": "…", "cardId": "…", "content": "+1" }
```

On success the server inserts the comment and broadcasts `comment_added`.

### Server-emitted events

| Event             | Payload                                                |
| ----------------- | ------------------------------------------------------ |
| `card_added`      | `{ card: { …, comments: [] } }`                        |
| `card_moved`      | `{ card, fromColumnId }`                               |
| `comment_added`   | `{ cardId, comment }`                                  |
| `presence_join`   | `{ displayName }`                                      |
| `presence_leave`  | `{ displayName }`                                      |

Clients should refetch the board (`GET /api/boards/:id`) on reconnect; the
server does not replay missed events.
