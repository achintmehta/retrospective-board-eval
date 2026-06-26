# API Reference

All non-WebSocket endpoints live under `/api`. JSON in, JSON out. CORS is open
in development; tighten as needed for production deployments.

## REST

### `GET /api/health`

Liveness probe. Returns `{ "ok": true }`.

### `GET /api/boards`

List all boards, newest first.

Response:

```json
[
  { "id": "uuid", "title": "Sprint 42", "created_at": "2026-06-26 14:00:01" }
]
```

### `POST /api/boards`

Create a new board. The server also seeds it with three default columns:
"Went Well", "Needs Improvement", "Action Items".

Request body:

```json
{ "title": "Sprint 42" }
```

Response: `201 Created` with the full board (board + columns + cards + comments).

### `GET /api/boards/:id`

Returns a board hydrated with its columns, cards, and comments.

```json
{
  "id": "uuid",
  "title": "Sprint 42",
  "created_at": "2026-06-26 14:00:01",
  "columns": [
    {
      "id": "uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "uuid",
          "content": "Great pairing session",
          "author_name": "Alice",
          "position": 0,
          "created_at": "...",
          "comments": [
            { "id": "uuid", "content": "+1", "author_name": "Bob", "created_at": "..." }
          ]
        }
      ]
    }
  ]
}
```

Returns `404` if the board is not found.

### `POST /api/boards/:id/columns`

Create a new column on a board. Appended after existing columns.

Request body:

```json
{ "title": "Action Items" }
```

Response: `201 Created` with `{ id, board_id, title, position }`.

### `GET /api/boards/:id/export`

Stream a CSV export of an entire board. The response includes
`Content-Type: text/csv` and a `Content-Disposition: attachment` header so
browsers trigger a download.

Columns: `Column, Card, Card Author, Card Created At, Comment, Comment Author,
Comment Created At`. Cards with no comments appear once with the comment fields
blank; cards with multiple comments produce one row per comment.

## Socket.io events

All clients open a single Socket.io connection to the server and join one room
per board they're viewing.

### Client → server

| Event          | Payload                                                     | Ack response                       |
| -------------- | ----------------------------------------------------------- | ---------------------------------- |
| `join_board`   | `{ boardId, displayName }`                                  | `{ ok, board }` or `{ ok:false, error }` |
| `leave_board`  | `{ boardId }`                                               | —                                  |
| `add_card`     | `{ boardId, columnId, content, authorName }`                | `{ ok, card }`                     |
| `move_card`    | `{ boardId, cardId, toColumnId, toIndex }`                  | `{ ok }`                           |
| `add_comment`  | `{ boardId, cardId, content, authorName }`                  | `{ ok, comment }`                  |

### Server → all clients in the board's room

| Event           | Payload                                          |
| --------------- | ------------------------------------------------ |
| `card_added`    | `{ columnId, card }`                             |
| `card_moved`    | `{ cardId, fromColumnId, toColumnId, toIndex }` |
| `comment_added` | `{ cardId, comment }`                            |

The server is the source of truth. On every mutation it writes to SQLite, then
broadcasts the resulting event to the board's room. Clients reflect the change
on receipt; the originating client also applies an optimistic update for drag
moves and reconciles on broadcast.

## Reconnection

`socket.io-client` reconnects automatically. The `BoardPage` re-emits
`join_board` on every reconnection and refetches the full board state, so any
events missed while disconnected are picked up on the refetch.
