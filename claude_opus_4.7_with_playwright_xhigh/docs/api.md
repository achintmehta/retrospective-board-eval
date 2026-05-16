# API Reference

The backend exposes a small REST API for board CRUD plus a Socket.io event
stream for live collaboration.

Base URL (local dev): `http://localhost:3001`

## REST endpoints

### `GET /api/boards`

List all boards, newest first.

Response `200`:

```json
[
  {
    "id": "0c4...",
    "title": "Sprint 24 Retro",
    "created_at": "2026-05-09 14:21:03"
  }
]
```

### `POST /api/boards`

Create a new board. Three default columns ("Went Well", "Needs Improvement",
"Action Items") are also created.

Request body:

```json
{ "title": "Sprint 24 Retro" }
```

Response `201`: the new board record. `400` if `title` is missing.

### `GET /api/boards/:id`

Fetch a board with all of its columns, cards, and comments.

Response `200`:

```json
{
  "id": "0c4...",
  "title": "Sprint 24 Retro",
  "created_at": "...",
  "columns": [
    {
      "id": "...",
      "board_id": "0c4...",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "...",
          "column_id": "...",
          "content": "Pairing on the migration",
          "author_name": "Alex",
          "position": 0,
          "created_at": "...",
          "comments": [
            {
              "id": "...",
              "card_id": "...",
              "content": "+1 — caught two bugs",
              "author_name": "Sam",
              "created_at": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

`404` if the board id is unknown.

### `POST /api/boards/:id/columns`

Add a new column. Request body: `{ "title": "Action Items" }`.

Response `201`: the column record. `400` if `title` is missing.

### `GET /api/boards/:id/export`

Stream the board contents as CSV. Returns
`Content-Type: text/csv; charset=utf-8` and an
`attachment` `Content-Disposition`. `404` if the board id is unknown.

The CSV has one row per card and one row per comment, with columns:

```
type, board_title, column, card_content, card_author, card_created_at,
comment_content, comment_author, comment_created_at
```

## Socket.io events

All clients connect to the same default namespace and join a room for the
board they're viewing. Card additions, moves, and comments are broadcast to
that room.

### Client → Server

| Event | Payload | Ack |
| --- | --- | --- |
| `join_board` | `{ boardId, displayName }` | `{ ok, error? }` |
| `add_card` | `{ boardId, columnId, content, authorName }` | `{ ok, card?, error? }` |
| `move_card` | `{ boardId, cardId, toColumnId, toPosition }` | `{ ok, error? }` |
| `add_comment` | `{ boardId, cardId, content, authorName }` | `{ ok, comment?, error? }` |

### Server → Client (broadcast within the board's room)

| Event | Payload |
| --- | --- |
| `card_added` | `{ card }` |
| `card_moved` | `{ cardId, toColumnId, toPosition }` |
| `comment_added` | `{ comment }` |

Clients should refetch `/api/boards/:id` after a reconnect to recover from any
events missed while disconnected.
