# API Reference

The server exposes two surfaces: a REST API for board CRUD and exports, and a Socket.io WebSocket API for real-time mutations and broadcasts. Both share the same Express server (default port `4000`).

## REST API

All bodies are JSON. Errors come back as `{ "error": "<message>" }` with a non-2xx status.

### `POST /api/boards`

Create a new board. The board is automatically seeded with three default columns: *Went Well*, *Needs Improvement*, *Action Items*.

Request:
```json
{ "title": "Sprint 42 Retro" }
```

Response `201`:
```json
{ "id": 7, "title": "Sprint 42 Retro", "created_at": "2026-05-08T13:55:21.123Z" }
```

### `GET /api/boards`

List all boards, newest first.

Response `200`:
```json
[
  { "id": 7, "title": "Sprint 42 Retro", "created_at": "2026-05-08T13:55:21.123Z" },
  { "id": 6, "title": "Sprint 41 Retro", "created_at": "2026-04-25T10:11:00.000Z" }
]
```

### `GET /api/boards/:id`

Fetch a board with all of its columns, cards, and comments.

Response `200`:
```json
{
  "id": 7,
  "title": "Sprint 42 Retro",
  "created_at": "2026-05-08T13:55:21.123Z",
  "columns": [
    {
      "id": 19,
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": 101,
          "column_id": 19,
          "content": "Pairing helped a lot.",
          "author_name": "Achint",
          "position": 0,
          "created_at": "2026-05-08T14:00:00.000Z",
          "comments": [
            {
              "id": 555,
              "card_id": 101,
              "content": "Agreed, +1.",
              "author_name": "Sam",
              "created_at": "2026-05-08T14:01:30.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

`404` if the board does not exist.

### `POST /api/boards/:id/columns`

Add a custom column to a board.

Request:
```json
{ "title": "Action Items" }
```

Response `201`:
```json
{ "id": 22, "board_id": 7, "title": "Action Items", "position": 3 }
```

### `GET /api/boards/:id/export`

Stream the board's contents as CSV. The response uses `Content-Disposition: attachment` and the columns:

```
type, column, card_content, comment_content, author, created_at
```

A `card` row has an empty `comment_content`; `comment` rows repeat the parent card's content for joined-table convenience.

### `GET /api/health`

Lightweight health check: `{ "ok": true }`.

## WebSocket API (Socket.io)

Connect to the Socket.io endpoint at the same origin (e.g. `ws://localhost:4000/socket.io`). All client→server events accept an ack callback that receives `{ ok: true }` or `{ ok: false, error }`.

### Client → Server

#### `join_board`

Join a board's room. Required before sending any other event.

```js
socket.emit('join_board', { boardId: 7, name: 'Achint' }, (ack) => { /* ... */ });
```

#### `add_card`

```js
socket.emit('add_card', { columnId: 19, content: 'Pairing helped a lot.' }, (ack) => { /* ... */ });
```

On success the server persists the card and broadcasts `card_added` to every client in the room.

#### `move_card`

```js
socket.emit('move_card', { cardId: 101, toColumnId: 20, position: 0 }, (ack) => { /* ... */ });
```

`position` is the destination index inside `toColumnId` (0-based). Cards in both the source and destination columns are reindexed to stay contiguous.

#### `add_comment`

```js
socket.emit('add_comment', { cardId: 101, content: 'Agreed, +1.' }, (ack) => { /* ... */ });
```

### Server → Client

These are broadcast to every client in the same `board:<id>` room, including the originator.

#### `card_added`

Full card payload, with `comments: []`.

```json
{
  "id": 101,
  "column_id": 19,
  "content": "Pairing helped a lot.",
  "author_name": "Achint",
  "position": 0,
  "created_at": "2026-05-08T14:00:00.000Z",
  "comments": []
}
```

#### `card_moved`

```json
{ "cardId": 101, "fromColumnId": 19, "toColumnId": 20, "position": 0 }
```

#### `comment_added`

```json
{
  "id": 555,
  "card_id": 101,
  "content": "Agreed, +1.",
  "author_name": "Sam",
  "created_at": "2026-05-08T14:01:30.000Z"
}
```

## Error model

Validation errors return `{ ok: false, error }` over sockets and `4xx` over REST. Authorization here is intentionally minimal — display names are trusted as-is, scoped to a single board room.
