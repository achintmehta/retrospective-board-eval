# API Reference

The backend exposes a small REST surface plus a Socket.io channel for real-time updates.

Base URL (dev): `http://localhost:4000`. In production, the same origin serves both the API and the built React client.

---

## Data shapes

```jsonc
// Board (summary, returned by list/create)
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": 1782434786555  // ms epoch
}

// Board (full, returned by GET /boards/:id and via join_board ack)
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": 1782434786555,
  "columns": [
    {
      "id": "uuid",
      "board_id": "uuid",
      "title": "Went Well",
      "position": 0,
      "created_at": 1782434786555,
      "cards": [
        {
          "id": "uuid",
          "column_id": "uuid",
          "content": "Pair-programming worked great",
          "author_name": "Alex",
          "position": 0,
          "created_at": 1782434786555,
          "comments": [
            {
              "id": "uuid",
              "card_id": "uuid",
              "content": "Strong agree",
              "author_name": "Sam",
              "created_at": 1782434786900
            }
          ]
        }
      ]
    }
  ]
}
```

---

## REST endpoints

All endpoints accept and return JSON. Errors are returned as `{ "error": "message" }` with a 4xx/5xx status.

### `GET /api/health`
Liveness probe. Returns `{ "ok": true }`.

### `GET /api/boards`
List all boards, sorted by `created_at` descending.

### `POST /api/boards`
Create a new board. Three default columns are seeded.

```http
POST /api/boards
Content-Type: application/json

{ "title": "Sprint 42 Retro" }
```

Returns `201 Created` with the board summary.

### `GET /api/boards/:id`
Fetch a single board with all its columns, cards, and comments. Returns `404` if not found.

### `POST /api/boards/:id/columns`
Append a column to a board.

```http
POST /api/boards/<board-id>/columns
Content-Type: application/json

{ "title": "Action Items 2" }
```

Returns `201 Created` with the column row.

### `GET /api/boards/:id/export`
Streams the board as a CSV attachment with the following columns:

```
board_title, column_title, card_content, card_author, card_created_at,
comment_content, comment_author, comment_created_at
```

- Empty columns produce one row with blank card/comment fields.
- Cards with no comments produce one row with blank comment fields.
- Cards with comments produce one row per comment.

---

## Socket.io events

Connect to the same origin. The server places each connection into a room keyed on the board id (`board:<boardId>`).

All client → server events accept an `ack` callback of shape `{ ok: true, ... } | { ok: false, error: string }`.

### `join_board` (client → server)
Subscribe to a board's room. Server responds with the full board state.

```js
socket.emit('join_board', { boardId }, (ack) => {
  // ack: { ok: true, board: {...} } or { ok: false, error: "..." }
});
```

### `add_card` (client → server)
```js
socket.emit('add_card', {
  columnId, content, authorName
}, (ack) => { /* { ok, card?, error? } */ });
```
Broadcasts `card_added` to the room.

### `move_card` (client → server)
```js
socket.emit('move_card', {
  cardId, toColumnId, toIndex
}, (ack) => { /* { ok, error? } */ });
```
- `toIndex` is the destination position (0-based). Out-of-range values are clamped.
- Positions in both source and destination columns are repacked to stay dense.

Broadcasts `card_moved` to the room.

### `add_comment` (client → server)
```js
socket.emit('add_comment', {
  cardId, content, authorName
}, (ack) => { /* { ok, comment?, error? } */ });
```
Broadcasts `comment_added` to the room.

### Server → client broadcasts

| Event           | Payload                                                     |
| --------------- | ----------------------------------------------------------- |
| `card_added`    | `{ card: { id, column_id, content, author_name, position, created_at } }` |
| `card_moved`    | `{ card, fromColumnId, toColumnId }`                        |
| `comment_added` | `{ comment: { id, card_id, content, author_name, created_at } }`          |

The sending client also receives its own broadcast; the UI deduplicates by id.

---

## Reconnection behavior

`socket.io-client` reconnects automatically. On reconnect the client re-emits `join_board`, which returns the fresh full-board state — so any updates missed while offline are picked up.
