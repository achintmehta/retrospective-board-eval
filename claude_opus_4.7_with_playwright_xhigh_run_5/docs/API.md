# API Reference

All HTTP endpoints are mounted under `/api`. JSON request/response bodies use
UTF-8. Socket.io connects on the root path.

## Health

### `GET /api/health`

```json
{ "ok": true }
```

## Boards

### `GET /api/boards`

List all boards, sorted by `created_at` descending.

**Response 200**
```json
[
  { "id": "<uuid>", "title": "Sprint 14 Retro", "created_at": 1719432000000 }
]
```

### `POST /api/boards`

Create a new board. The board is auto-populated with three default columns:
`Went Well`, `Needs Improvement`, `Action Items`.

**Request**
```json
{ "title": "Sprint 14 Retro" }
```

**Response 201**
```json
{ "id": "<uuid>", "title": "Sprint 14 Retro", "created_at": 1719432000000 }
```

**Response 400** — `{ "error": "title is required" }`

### `GET /api/boards/:id`

Fetch a board with its full state: columns, cards, and comments.

**Response 200**
```json
{
  "id": "<uuid>",
  "title": "Sprint 14 Retro",
  "created_at": 1719432000000,
  "columns": [
    {
      "id": "<uuid>",
      "board_id": "<uuid>",
      "title": "Went Well",
      "position": 0,
      "created_at": 1719432000000,
      "cards": [
        {
          "id": "<uuid>",
          "column_id": "<uuid>",
          "content": "Deployed v2",
          "author_name": "Alice",
          "position": 0,
          "created_at": 1719432100000,
          "comments": [
            {
              "id": "<uuid>",
              "card_id": "<uuid>",
              "content": "Big win!",
              "author_name": "Bob",
              "created_at": 1719432200000
            }
          ]
        }
      ]
    }
  ]
}
```

**Response 404** — `{ "error": "board not found" }`

## Columns

### `POST /api/boards/:id/columns`

Append a new column to the board. The new column's `position` is set to the
current max + 1.

**Request**
```json
{ "title": "Action Items" }
```

**Response 201**
```json
{
  "id": "<uuid>",
  "board_id": "<uuid>",
  "title": "Action Items",
  "position": 3,
  "created_at": 1719432300000,
  "cards": []
}
```

**Broadcasts** `column_added` to the board's Socket.io room with the same payload.

## Export

### `GET /api/boards/:id/export`

Streams a CSV of the board. Each row is either a `card` or a `comment`; the
`type` column distinguishes them.

**Headers**
- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="<board-title>.csv"`

**Columns**
| Column                  | Description                                         |
|-------------------------|-----------------------------------------------------|
| `board_title`           | Title of the board                                  |
| `column`                | Column title                                        |
| `type`                  | `card` or `comment`                                 |
| `content`               | Card or comment content                             |
| `author`                | Display name of the author                          |
| `created_at`            | ISO 8601 timestamp                                  |
| `parent_card_content`   | For comments, the content of the parent card        |

## Socket.io

The client connects to the same origin as the server. The handshake does not
require auth; clients become "authenticated" by emitting `join_board` with a
display name.

### Client → Server

#### `join_board`
```js
socket.emit('join_board', { boardId, displayName }, (ack) => { ... });
```
Joins the board's broadcast room and stores the display name on the socket.
Acknowledgement: `{ ok: true }` or `{ ok: false, error: '...' }`.

#### `leave_board`
```js
socket.emit('leave_board', { boardId });
```

#### `add_card`
```js
socket.emit('add_card', { boardId, columnId, content }, (ack) => { ... });
```
Server persists the card and broadcasts `card_added` to the board room.

#### `move_card`
```js
socket.emit('move_card', { boardId, cardId, targetColumnId, targetIndex });
```
Server reorders positions in source/target columns transactionally and
broadcasts `card_moved`.

#### `add_comment`
```js
socket.emit('add_comment', { boardId, cardId, content }, (ack) => { ... });
```
Server persists the comment and broadcasts `comment_added`.

### Server → Client

| Event          | Payload                                                                                   |
|----------------|-------------------------------------------------------------------------------------------|
| `card_added`   | `{ id, column_id, board_id, content, author_name, position, created_at, comments: [] }`   |
| `card_moved`   | `{ card, sourceColumnId, targetColumnId }`                                                |
| `comment_added`| `{ id, card_id, board_id, content, author_name, created_at }`                             |
| `column_added` | Column object (matches `POST /api/boards/:id/columns` response)                           |

## Data Model

```
Board     (id, title, created_at)
└── BoardColumn (id, board_id, title, position, created_at)
    └── Card    (id, column_id, content, author_name, position, created_at)
        └── Comment (id, card_id, content, author_name, created_at)
```

SQLite enforces foreign keys with cascading deletes — deleting a board removes
its columns, cards, and comments. WAL journaling is enabled for safe concurrent
reads alongside writes.
