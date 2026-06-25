# API Reference

The backend exposes a small REST surface for setup/read operations and uses Socket.io for real-time mutations (adding cards, moving cards, commenting).

Base URL (local dev): `http://localhost:3001`

## REST Endpoints

All endpoints accept and return JSON unless otherwise noted.

### `GET /api/boards`

List all boards, newest first.

**Response 200**
```json
[
  { "id": "uuid", "title": "Sprint 24", "created_at": 1718000000000 }
]
```

### `POST /api/boards`

Create a new board. Three default columns are seeded automatically: *Went Well*, *Needs Improvement*, *Action Items*.

**Request body**
```json
{ "title": "Sprint 24 Retro" }
```

**Response 201** — full board (see `GET /api/boards/:id`).
**Errors:** `400` if `title` is missing/empty.

### `GET /api/boards/:id`

Fetch a single board with all columns, cards, and comments embedded.

**Response 200**
```json
{
  "id": "uuid",
  "title": "Sprint 24",
  "created_at": 1718000000000,
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
          "content": "Shipped feature X",
          "author_name": "Alice",
          "created_at": 1718000010000,
          "position": 0,
          "comments": [
            {
              "id": "comment-uuid",
              "card_id": "card-uuid",
              "content": "🎉",
              "author_name": "Bob",
              "created_at": 1718000020000
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors:** `404` if not found.

### `POST /api/boards/:id/columns`

Add a column to a board.

**Request body**
```json
{ "title": "Action Items" }
```

**Response 201**
```json
{ "id": "col-uuid", "board_id": "uuid", "title": "Action Items", "position": 3, "cards": [] }
```

**Errors:** `400` if `title` missing, `404` if board not found.

### `GET /api/boards/:id/export`

Stream the board as a CSV file. The response is `text/csv` with a `Content-Disposition: attachment` header.

Columns: `column_position, column_title, card_content, card_author, card_created_at, comment_content, comment_author, comment_created_at`. Rows are emitted per `(column, card, comment)` join — cards with no comments produce one row; cards with comments produce one row per comment.

## Socket.io Events

All real-time interactions happen over a single Socket.io connection at the same host as the REST API. Clients should connect with the default options (Socket.io will auto-negotiate websocket transport).

### Joining a board (room)

Before emitting any mutation, the client must join the board's room.

```js
socket.emit('join_board', { boardId });
socket.emit('leave_board', { boardId });
```

### Client → Server events

Each mutation accepts an optional `ack` callback receiving `{ ok: true, ... }` or `{ ok: false, error }`.

#### `add_card`
```js
socket.emit('add_card', {
  boardId,
  columnId,
  content: 'We deployed on Tuesday',
  authorName: 'Alice'
}, (ack) => { /* { ok, card } */ });
```

#### `move_card`
```js
socket.emit('move_card', {
  boardId,
  cardId,
  toColumnId,
  toIndex: 0
}, (ack) => { /* { ok, result } */ });
```

#### `add_comment`
```js
socket.emit('add_comment', {
  boardId,
  cardId,
  content: 'Same here',
  authorName: 'Bob'
}, (ack) => { /* { ok, comment } */ });
```

### Server → Client events

These are broadcast to every client in `board:<boardId>`.

#### `card_added`
```json
{
  "id": "uuid",
  "column_id": "col-uuid",
  "content": "...",
  "author_name": "Alice",
  "created_at": 1718000000000,
  "position": 0,
  "board_id": "uuid",
  "comments": []
}
```

#### `card_moved`
```json
{
  "cardId": "uuid",
  "fromColumnId": "col-uuid-a",
  "toColumnId": "col-uuid-b",
  "toIndex": 2,
  "boardId": "uuid"
}
```

#### `comment_added`
```json
{
  "id": "uuid",
  "card_id": "card-uuid",
  "content": "...",
  "author_name": "Bob",
  "created_at": 1718000050000,
  "board_id": "uuid"
}
```

## Reconnection

Socket.io handles reconnections automatically. On `reconnect`, the client re-emits `join_board` and refetches `/api/boards/:id` to ensure full state consistency (the server is the source of truth).

## Authentication

There is no server-side authentication. The client requires a display name (stored in `sessionStorage`) before connecting. The `authorName` field on every event is supplied by the client.
