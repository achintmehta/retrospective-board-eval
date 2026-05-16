# API Reference

The Retro Board backend exposes a small REST API for board management plus a
Socket.io interface for real-time collaboration. All REST endpoints are
mounted under `/api`.

## REST

### `GET /api/health`

Returns `{ "ok": true }`. Use for liveness probes.

### `GET /api/boards`

List all boards, sorted by creation date descending.

```json
[
  { "id": "uuid", "title": "Sprint 12 Retro", "created_at": "2026-05-14T10:00:00.000Z" }
]
```

### `POST /api/boards`

Create a new board. Default columns *Went Well*, *Needs Improvement*, and
*Action Items* are created automatically.

Request:
```json
{ "title": "Sprint 12 Retro" }
```

Response: `201 Created`
```json
{ "id": "uuid", "title": "Sprint 12 Retro", "created_at": "2026-05-14T10:00:00.000Z" }
```

### `GET /api/boards/:id`

Fetch a board with all its columns, cards, and comments.

Response:
```json
{
  "id": "uuid",
  "title": "Sprint 12 Retro",
  "created_at": "...",
  "columns": [
    {
      "id": "uuid",
      "board_id": "uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "uuid",
          "column_id": "uuid",
          "content": "Pairing sessions worked great",
          "author_name": "Achint",
          "position": 0,
          "created_at": "...",
          "comments": [
            { "id": "uuid", "card_id": "uuid", "content": "+1", "author_name": "Sam", "created_at": "..." }
          ]
        }
      ]
    }
  ]
}
```

`404` if the board does not exist.

### `POST /api/boards/:id/columns`

Add a new column to a board. The new column is appended at the end
(`position = max(existing) + 1`).

Request: `{ "title": "Action Items" }`

Response: `201 Created` with `{ id, board_id, title, position }`.

### `GET /api/boards/:id/export`

Stream the board contents as CSV with the columns:

```
Column, Card Content, Card Author, Card Created At, Comment Content, Comment Author, Comment Created At
```

A row is emitted per (card, comment) pair. Cards with no comments still appear
once with empty comment fields. Empty columns yield a single row with empty
card/comment fields.

The response sets `Content-Type: text/csv` and a `Content-Disposition`
attachment header derived from the board title.

## WebSocket (Socket.io)

The client connects to the same origin. Each board is a Socket.io room named
`board:<boardId>`.

### Outbound events (client → server)

| Event          | Payload                                                                   | Notes                              |
|----------------|---------------------------------------------------------------------------|------------------------------------|
| `join_board`   | `{ boardId, displayName }`                                                | Join the room. Required first.     |
| `leave_board`  | `{ boardId }`                                                             | Optional cleanup on unmount.       |
| `add_card`     | `{ boardId, columnId, content, authorName }`                              | Server appends to column.          |
| `move_card`    | `{ boardId, cardId, toColumnId, toPosition }`                             | Reposition within / across columns.|
| `add_comment`  | `{ boardId, cardId, content, authorName }`                                | Append a comment to a card.        |

All outbound events accept an optional Socket.io ack callback that receives
`{ ok: true, ... }` or `{ ok: false, error }`.

### Inbound events (server → client)

| Event           | Payload                                                                         | Description                                |
|-----------------|---------------------------------------------------------------------------------|--------------------------------------------|
| `card_added`    | `{ columnId, card }`                                                            | Card was added; broadcast to room.         |
| `card_moved`    | `{ card, fromColumnId, toColumnId }`                                            | Card moved/reordered; clients re-render.   |
| `comment_added` | `{ cardId, comment }`                                                           | Comment added to a card.                   |

## Errors

REST endpoints return JSON `{ "error": "..." }` with appropriate status codes:

- `400` — missing or invalid input (e.g. empty title)
- `404` — board / column / card not found

Socket events report errors via the ack callback. Authoritative state always
comes from the server; if a client suspects drift (e.g. after reconnect) it
should refetch with `GET /api/boards/:id`.
