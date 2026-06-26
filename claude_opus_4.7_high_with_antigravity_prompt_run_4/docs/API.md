# API reference

The backend exposes two surfaces:

- A small **REST API** for board creation, listing, retrieval, column creation, and CSV export.
- A **Socket.io** channel for everything that needs to be real-time: adding cards,
  moving cards between columns, and posting comments.

All endpoints live under `/api`. All Socket.io events are namespaced by board via rooms
(`board:<id>`).

---

## REST endpoints

### `GET /api/health`
Lightweight liveness probe.

```json
{ "ok": true }
```

### `POST /api/boards`
Create a new retrospective board. A new board is seeded with three default columns:
`Went Well`, `Needs Improvement`, `Action Items`.

**Request**
```json
{ "title": "Sprint 42 Retro" }
```

**Response** `201 Created`
```json
{
  "id": "Vx7nqB2kEL",
  "title": "Sprint 42 Retro",
  "created_at": 1719310923123,
  "columns": [
    { "id": "...", "title": "Went Well", "position": 0, "cards": [] },
    { "id": "...", "title": "Needs Improvement", "position": 1, "cards": [] },
    { "id": "...", "title": "Action Items", "position": 2, "cards": [] }
  ]
}
```

| Status | Meaning                          |
| ------ | -------------------------------- |
| 201    | Board created                    |
| 400    | Missing or invalid title         |

### `GET /api/boards`
List all boards, newest first.

**Response** `200 OK`
```json
[
  {
    "id": "Vx7nqB2kEL",
    "title": "Sprint 42 Retro",
    "created_at": 1719310923123,
    "column_count": 3,
    "card_count": 12
  }
]
```

### `GET /api/boards/:id`
Fetch a single board with its columns, cards, and nested comments.

**Response** `200 OK`
```json
{
  "id": "Vx7nqB2kEL",
  "title": "Sprint 42 Retro",
  "created_at": 1719310923123,
  "columns": [
    {
      "id": "col_1",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "card_1",
          "column_id": "col_1",
          "content": "Pairing sessions went smoothly",
          "author_name": "Avery",
          "position": 0,
          "created_at": 1719311000000,
          "comments": [
            {
              "id": "c1",
              "card_id": "card_1",
              "content": "+1 from me!",
              "author_name": "Jordan",
              "created_at": 1719311010000
            }
          ]
        }
      ]
    }
  ]
}
```

| Status | Meaning            |
| ------ | ------------------ |
| 200    | OK                 |
| 404    | Board not found    |

### `POST /api/boards/:id/columns`
Add a custom column to a board. The server emits a `column_added` Socket.io event to
the board's room so live clients update instantly.

**Request**
```json
{ "title": "Shoutouts" }
```

**Response** `201 Created`
```json
{ "id": "col_x", "board_id": "Vx7nqB2kEL", "title": "Shoutouts", "position": 3 }
```

| Status | Meaning                       |
| ------ | ----------------------------- |
| 201    | Column created                |
| 400    | Missing or invalid title      |
| 404    | Board not found               |

### `GET /api/boards/:id/export`
Download the board as a CSV file. Each row is one *(column × card × comment)* triple —
cards with no comments still appear once, with empty comment columns.

**Response** `200 OK`, `Content-Type: text/csv; charset=utf-8`

```
board_title,column,card_content,card_author,card_created_at,comment_content,comment_author,comment_created_at
Sprint 42 Retro,Went Well,Pairing sessions went smoothly,Avery,2024-06-25T10:23:20.000Z,+1 from me!,Jordan,2024-06-25T10:23:30.000Z
```

---

## Socket.io events

The client connects to the same origin (Vite proxies `/socket.io` in dev). All events
are acknowledged: pass a callback as the last argument and you'll receive
`{ ok: true, ... }` on success or `{ ok: false, error }` on failure.

### Client → server

| Event         | Payload                                                                 | Notes                                  |
| ------------- | ----------------------------------------------------------------------- | -------------------------------------- |
| `join_board`  | `{ boardId, displayName }`                                              | Must be called before any other event. |
| `add_card`    | `{ columnId, content }`                                                 | Author = the display name from join.   |
| `move_card`   | `{ cardId, targetColumnId, targetIndex }`                               | Server is the source of truth.         |
| `add_comment` | `{ cardId, content }`                                                   | Posts under the given card.            |

### Server → client (broadcast to `board:<id>`)

| Event              | Payload                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `card_added`       | The full card object including `comments: []`.                                 |
| `card_moved`       | `{ cardId, sourceColumnId, targetColumnId, targetIndex }`                      |
| `comment_added`    | The full comment object.                                                       |
| `column_added`     | `{ id, board_id, title, position }`                                            |
| `presence_joined`  | `{ displayName }` — emitted to everyone *except* the joiner.                   |
| `presence_left`    | `{ displayName }` — emitted on disconnect.                                     |

### Reconnect behavior

The client refetches the board over REST after a successful socket reconnect to ensure
local state matches the server (the server is the source of truth and broadcasts that
happened during the disconnect are not replayed).
