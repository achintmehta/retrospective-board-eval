# API Reference

The backend exposes both a REST API (JSON over HTTP) and a Socket.io event API.
The Socket.io API is the source of realtime updates; REST handles setup and export.

Base URL: `http://<host>:<port>/api`

## REST endpoints

### `GET /api/health`

Simple liveness probe.

```json
{ "ok": true }
```

### `POST /api/boards`

Create a new retrospective board. Default columns are automatically created:
`Went Well`, `Needs Improvement`, `Action Items`.

Body:

```json
{ "title": "Sprint 42 Retro" }
```

`title` is required, max 120 chars.

Response `201`:

```json
{ "id": "uuid", "title": "Sprint 42 Retro", "created_at": 1719852000000 }
```

### `GET /api/boards`

List all boards, newest first.

Response `200`:

```json
[
  { "id": "uuid", "title": "Sprint 42 Retro", "created_at": 1719852000000 }
]
```

### `GET /api/boards/:id`

Fetch a fully hydrated board — columns, cards, and comments.

Response `200`:

```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": 1719852000000,
  "columns": [
    {
      "id": "col-uuid",
      "board_id": "uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "card-uuid",
          "column_id": "col-uuid",
          "content": "Fast turnaround on the auth spike",
          "author_name": "Ada",
          "created_at": 1719852160000,
          "position": 0,
          "comments": [
            {
              "id": "comment-uuid",
              "card_id": "card-uuid",
              "content": "Agreed, huge help!",
              "author_name": "Grace",
              "created_at": 1719852220000
            }
          ]
        }
      ]
    }
  ]
}
```

Errors: `404` when the board does not exist.

### `POST /api/boards/:id/columns`

Append a new column to the board.

Body:

```json
{ "title": "Kudos" }
```

`title` is required, max 60 chars.

Response `201`:

```json
{ "id": "col-uuid", "board_id": "uuid", "title": "Kudos", "position": 3 }
```

### `GET /api/boards/:id/export`

Streams a CSV file of the board with headers:

```
Column, Card, Card Author, Card Created At, Comment, Comment Author, Comment Created At
```

Each card produces one row, plus one additional row per comment. Empty comment
columns are used when a card has no comments. Timestamps are ISO 8601.

Response headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="retro_<sanitized-title>.csv"
```

Errors: `404` when the board does not exist.

## Socket.io events

Connect to the same origin (`ws://<host>:<port>/socket.io`). All events carry a `boardId`
so the server can route them to the right room.

### Client → Server

| Event         | Payload                                                                                             | Notes                                                    |
| ------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `join_board`  | `{ boardId, displayName }`                                                                          | Joins the `board:<boardId>` room. Required before edits. |
| `add_card`    | `{ boardId, columnId, content, authorName }`                                                        | Content max 1000 chars.                                  |
| `move_card`   | `{ boardId, cardId, toColumnId, toPosition }`                                                       | `toPosition` is zero-based index in the target column.   |
| `add_comment` | `{ boardId, cardId, content, authorName }`                                                          | Content max 500 chars.                                   |

### Server → Client

| Event           | Payload                                                        | Notes                                                             |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `joined`        | `{ boardId }`                                                  | Ack after a successful `join_board`.                              |
| `card_added`    | `{ boardId, columnId, card }`                                  | `card` includes `comments: []`.                                   |
| `card_moved`    | `{ boardId, columnOrder }`                                     | `columnOrder` is `{ columnId: cardId[] }` for every column.       |
| `comment_added` | `{ boardId, cardId, comment }`                                 | Broadcast to everyone in the room, including the sender.          |

### Reconnect

On reconnect the client should re-emit `join_board` and refetch `/api/boards/:id`
to guarantee consistency — Socket.io handles the transport reconnect automatically.
