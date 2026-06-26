# API Reference

The server exposes a JSON REST API for board management plus a Socket.io channel for realtime collaboration. The base URL is the deployed server origin (`http://localhost:3001` in local dev).

## REST endpoints

All endpoints return JSON unless noted. Errors return `{ "error": "<message>" }` with an appropriate HTTP status code.

### `GET /api/health`

Liveness probe. Returns `{ "ok": true }`.

### `GET /api/boards`

List all boards, newest first.

**Response 200**
```json
[
  { "id": "uuid", "title": "Sprint 24 retro", "created_at": 1719300000000 }
]
```

### `POST /api/boards`

Create a new board. Default columns ("Went Well", "Needs Improvement", "Action Items") are created automatically.

**Body**
```json
{ "title": "Sprint 24 retro" }
```

**Response 201**
```json
{ "id": "uuid", "title": "Sprint 24 retro", "created_at": 1719300000000 }
```

**Errors**: `400` if `title` is missing or empty.

### `GET /api/boards/:id`

Fetch the board with all columns, their cards, and each card's comments.

**Response 200**
```json
{
  "id": "uuid",
  "title": "Sprint 24 retro",
  "created_at": 1719300000000,
  "columns": [
    {
      "id": "col-uuid",
      "board_id": "uuid",
      "title": "Went Well",
      "position": 0,
      "created_at": 1719300000000,
      "cards": [
        {
          "id": "card-uuid",
          "column_id": "col-uuid",
          "content": "Pairing helped a lot",
          "author_name": "Alex",
          "position": 0,
          "created_at": 1719300100000,
          "comments": [
            {
              "id": "cm-uuid",
              "card_id": "card-uuid",
              "content": "+1",
              "author_name": "Sam",
              "created_at": 1719300200000
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors**: `404` if the board does not exist.

### `GET /api/boards/:id/columns`

List the columns for a board (without cards).

### `POST /api/boards/:id/columns`

Add a column to a board. The new column is appended to the end and broadcast over Socket.io as `column_added` to subscribers of the board room.

**Body**
```json
{ "title": "Action Items" }
```

**Response 201**
```json
{ "id": "col-uuid", "board_id": "uuid", "title": "Action Items", "position": 3, "created_at": 1719300300000 }
```

### `GET /api/boards/:id/export`

Stream the board's contents as CSV (`Content-Type: text/csv`). The response includes a `Content-Disposition` header so browsers prompt to save the file.

**CSV columns**
`type,column,card_author,card_content,comment_author,comment_content,created_at`

Each card emits one `card` row and one `comment` row per associated comment. `created_at` values are ISO-8601 timestamps.

## Socket.io events

The client must connect to the server with `socket.io-client` (default path `/socket.io`). All events accept an optional acknowledgement callback as the last argument.

### Client → server

#### `join_board`

Subscribes the socket to the board's room. Required before sending any other event.

```js
socket.emit('join_board', { boardId, displayName }, (resp) => {
  // resp = { ok: true } | { ok: false, error: '...' }
});
```

Errors: missing display name, missing board ID, or unknown board.

#### `add_card`

```js
socket.emit('add_card', { columnId, content });
```

Creates a card in the column. Author is taken from the socket's joined display name. Broadcasts `card_added` to the room.

#### `move_card`

```js
socket.emit('move_card', { cardId, toColumnId, toPosition });
```

Moves a card to a new column and position. Reorders sibling cards in both source and destination columns. Broadcasts `card_moved` to the room.

#### `add_comment`

```js
socket.emit('add_comment', { cardId, content });
```

Adds a comment to the card. Broadcasts `comment_added` to the room.

### Server → client

| Event           | Payload                                                                |
| --------------- | ---------------------------------------------------------------------- |
| `card_added`    | The created card object                                                 |
| `card_moved`    | `{ cardId, fromColumnId, toColumnId, toPosition }`                      |
| `comment_added` | The created comment object                                              |
| `column_added`  | The created column object (emitted when a column is added via REST)     |

## Data model

| Table           | Columns                                                              |
| --------------- | -------------------------------------------------------------------- |
| `boards`        | `id`, `title`, `created_at`                                          |
| `board_columns` | `id`, `board_id`, `title`, `position`, `created_at`                  |
| `cards`         | `id`, `column_id`, `content`, `author_name`, `position`, `created_at`|
| `comments`      | `id`, `card_id`, `content`, `author_name`, `created_at`              |

IDs are UUIDs. Foreign keys cascade on delete. The database is SQLite with WAL journal mode and foreign keys enabled.
