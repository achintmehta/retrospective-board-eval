# API Reference

The server exposes a small REST API for board CRUD and a Socket.io interface for real-time collaboration. Base URL during development is `http://localhost:3001`.

## REST endpoints

### `GET /api/health`

Health check. Returns `{ "ok": true }`.

### `POST /api/boards`

Create a new board. The board is created with three default columns: `Went Well`, `Needs Improvement`, `Action Items`.

Request body:

```json
{ "title": "Sprint 42 Retro" }
```

Response `201`:

```json
{ "id": "x9hG...", "title": "Sprint 42 Retro", "createdAt": 1718900000000 }
```

Errors: `400` if `title` is missing or empty.

### `GET /api/boards`

List all boards, newest first.

Response `200`:

```json
[
  { "id": "x9hG...", "title": "Sprint 42 Retro", "createdAt": 1718900000000 }
]
```

### `GET /api/boards/:id`

Fetch a board with its columns, cards, and nested comments.

Response `200`:

```json
{
  "id": "x9hG...",
  "title": "Sprint 42 Retro",
  "createdAt": 1718900000000,
  "columns": [
    {
      "id": "col1",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "card1",
          "columnId": "col1",
          "content": "Great deploy cadence",
          "authorName": "Alice",
          "position": 0,
          "createdAt": 1718900100000,
          "comments": [
            {
              "id": "cmt1",
              "cardId": "card1",
              "content": "Agreed!",
              "authorName": "Bob",
              "createdAt": 1718900200000
            }
          ]
        }
      ]
    }
  ]
}
```

Errors: `404` if board does not exist.

### `POST /api/boards/:id/columns`

Add a new column to a board. New column is appended to the end.

Request body:

```json
{ "title": "Action Items" }
```

Response `201`:

```json
{ "id": "col_id", "boardId": "x9hG...", "title": "Action Items", "position": 3 }
```

This also broadcasts a `column_added` Socket.io event to the board's room.

### `GET /api/boards/:id/export`

Stream a CSV export of the entire board. One row per (column × card × comment) combination. Empty columns and commentless cards still produce one row.

Response headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="<board_title>.csv"
```

CSV columns:

```
board_id, board_title, column_id, column_title,
card_id, card_content, card_author, card_created_at,
comment_id, comment_content, comment_author, comment_created_at
```

## Socket.io events

The server uses board-scoped rooms named `board:<id>`. A client must `join_board` before sending mutation events.

### Client → Server

| Event         | Payload                                            | Ack response                              |
| ------------- | -------------------------------------------------- | ----------------------------------------- |
| `join_board`  | `{ boardId }`                                      | `{ ok, board? , error? }`                 |
| `leave_board` | `{ boardId }`                                      | _(no ack)_                                |
| `add_card`    | `{ boardId, columnId, content, authorName }`       | `{ ok, card?, error? }`                   |
| `move_card`   | `{ boardId, cardId, toColumnId, toIndex }`         | `{ ok, fromColumnId, toColumnId, ... }`   |
| `add_comment` | `{ boardId, cardId, content, authorName }`         | `{ ok, comment?, error? }`                |

### Server → Client (broadcast to `board:<id>`)

| Event           | Payload                                                                          |
| --------------- | -------------------------------------------------------------------------------- |
| `card_added`    | `{ id, columnId, content, authorName, position, createdAt, comments: [] }`       |
| `card_moved`    | `{ cardId, fromColumnId, toColumnId, toIndex, sameColumn, boardId }`             |
| `comment_added` | `{ id, cardId, content, authorName, createdAt }`                                 |
| `column_added`  | `{ id, boardId, title, position }`                                               |

### Reconnect behavior

Socket.io reconnects automatically. On reconnect the client re-emits `join_board`, which returns the fresh authoritative board state. This avoids state drift after temporary disconnects.

## Data model

```
boards         (id, title, created_at)
board_columns  (id, board_id → boards.id, title, position)
cards          (id, column_id → board_columns.id, content, author_name,
                position, created_at)
comments       (id, card_id → cards.id, content, author_name, created_at)
```

All foreign keys cascade on delete. SQLite runs in WAL mode for better concurrent read/write behavior.
