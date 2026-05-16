# API Reference

All endpoints are JSON over HTTP under the `/api` prefix. Real-time updates
flow over a Socket.io connection on the same origin.

## REST

### `GET /api/boards`

List all boards, newest first.

**Response 200**
```json
[
  { "id": "uuid", "title": "Sprint 1", "created_at": 1714650000000 }
]
```

### `POST /api/boards`

Create a new board. Three default columns ("Went Well", "Needs Improvement",
"Action Items") are created with it.

**Request**
```json
{ "title": "Sprint 1 Retro" }
```

**Response 201** — full board object (see `GET /api/boards/:id`).

**Response 400** — `{ "error": "title is required" }` if the title is empty.

### `GET /api/boards/:id`

Fetch a board with its columns, cards, and comments.

**Response 200**
```json
{
  "id": "uuid",
  "title": "Sprint 1 Retro",
  "created_at": 1714650000000,
  "columns": [
    {
      "id": "uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "uuid",
          "column_id": "uuid",
          "content": "Pairing was great",
          "author_name": "Alice",
          "position": 0,
          "created_at": 1714650100000,
          "comments": [
            {
              "id": "uuid",
              "card_id": "uuid",
              "content": "Agreed",
              "author_name": "Bob",
              "created_at": 1714650200000
            }
          ]
        }
      ]
    }
  ]
}
```

**Response 404** — `{ "error": "board not found" }`.

### `POST /api/boards/:id/columns`

Add a column to a board. New columns are appended at the end.

**Request**
```json
{ "title": "Kudos" }
```

**Response 201**
```json
{ "id": "uuid", "board_id": "uuid", "title": "Kudos", "position": 3, "cards": [] }
```

### `GET /api/boards/:id/export`

Stream the board as CSV (`text/csv; charset=utf-8`) with
`Content-Disposition: attachment`. One row per (column, card, comment); cards
with no comments produce one row with empty comment columns. Columns:

```
column,card_content,card_author,card_created_at,comment_content,comment_author,comment_created_at
```

Timestamps are ISO 8601.

## WebSocket protocol (Socket.io)

The client connects to the same origin (no separate URL needed). Each board has
a Socket.io room named `board:<board-id>`; the server fans every change out to
the room the change belongs to.

### Client → server

| Event          | Payload                                                  | Ack                                            |
| -------------- | -------------------------------------------------------- | ---------------------------------------------- |
| `join_board`   | `{ boardId }`                                            | none                                           |
| `leave_board`  | `{ boardId }`                                            | none                                           |
| `add_card`     | `{ columnId, content, authorName }`                      | `{ ok, card }` or `{ error }`                  |
| `move_card`    | `{ cardId, toColumnId, toPosition }`                     | `{ ok }` or `{ error }`                        |
| `add_comment`  | `{ cardId, content, authorName }`                        | `{ ok, comment }` or `{ error }`               |

`toPosition` is a zero-based index. The server reorders sibling cards in both
the source and destination columns so positions stay contiguous.

### Server → client (broadcast to the board's room)

| Event           | Payload                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| `card_added`    | A full card object (with empty `comments`)                               |
| `card_moved`    | `{ cardId, toColumnId, toPosition }`                                     |
| `comment_added` | A full comment object                                                    |

The same client that initiated an action also receives the broadcast — this is
intentional so every client applies the canonical server-side ordering rather
than its own optimistic version.

### Recovery from disconnect

Socket.io reconnects automatically. The client re-emits `join_board` on
reconnect and re-fetches the full board with `GET /api/boards/:id` to recover
any state it may have missed.
