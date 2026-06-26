# API Reference

The backend exposes two surfaces:

- **REST** for board creation, listing, fetching, column creation, and CSV
  export. Use it for "edit page state" type operations.
- **Socket.io** for everything that needs to broadcast to other clients on the
  same board (cards, card moves, comments).

All REST responses are JSON unless noted otherwise.

## Authentication

There is none. Sessions are guest-only: a client supplies a `displayName` when
joining a board over Socket.io, and that name is used as the author for any
cards or comments produced during the session.

## REST endpoints

### `GET /api/health`

Health check.

```json
{ "ok": true }
```

### `GET /api/boards`

List all boards, newest first.

```json
{
  "boards": [
    { "id": "f1a2…", "title": "Sprint 42 Retro", "created_at": "2026-06-25T18:00:00.000Z" }
  ]
}
```

### `POST /api/boards`

Create a new board. The new board is seeded with three default columns:
"Went Well", "Needs Improvement", "Action Items".

Request body:

```json
{ "title": "Sprint 42 Retro" }
```

Response (`201`):

```json
{
  "board": { "id": "f1a2…", "title": "Sprint 42 Retro", "created_at": "…" }
}
```

### `GET /api/boards/:id`

Fetch a single board with all its columns, cards, and comments.

```json
{
  "board": {
    "id": "f1a2…",
    "title": "Sprint 42 Retro",
    "created_at": "…",
    "columns": [
      { "id": "c1", "board_id": "f1a2…", "title": "Went Well", "position": 0, "created_at": "…" }
    ],
    "cards": [
      { "id": "k1", "column_id": "c1", "content": "Deploy was smooth", "author_name": "Ada", "position": 0, "created_at": "…" }
    ],
    "comments": [
      { "id": "m1", "card_id": "k1", "content": "+1", "author_name": "Linus", "created_at": "…" }
    ]
  }
}
```

`404` if the board does not exist.

### `POST /api/boards/:id/columns`

Add a new column to an existing board. Position is auto-assigned to the end.

Request body:

```json
{ "title": "Shout-outs" }
```

Response (`201`):

```json
{
  "column": { "id": "c4", "board_id": "f1a2…", "title": "Shout-outs", "position": 3, "created_at": "…" }
}
```

### `GET /api/boards/:id/export`

Streams a CSV file describing the entire board. The response has
`Content-Type: text/csv` and `Content-Disposition: attachment`, so browsers
trigger a download.

Columns:

```
column, card_content, card_author, card_created_at, comment_content, comment_author, comment_created_at
```

Each card produces one row, plus one row per comment on that card. Columns
with no cards produce a placeholder row so the export reflects the board
structure even when empty.

## Socket.io events

The server runs at the same origin as the REST API on `/socket.io`. All
client → server events accept an optional acknowledgement callback that
returns either `{ ok: true, ... }` or `{ error: "message" }`.

### `join_board` (client → server)

Must be called once after connecting. The server places the socket into a
room scoped to that board, so subsequent broadcasts only reach participants
of the same board.

```js
socket.emit('join_board', { boardId, displayName }, (resp) => { ... });
```

### `add_card` (client → server)

```js
socket.emit('add_card', { columnId, content }, ack);
```

On success, the server emits `card_added` to everyone in the board room
(including the sender):

```js
socket.on('card_added', ({ card }) => { ... });
```

### `move_card` (client → server)

```js
socket.emit('move_card', { cardId, toColumnId, toIndex }, ack);
```

`toIndex` is the zero-based slot in the destination column. The server
renumbers card positions in the source and destination columns and emits
`card_moved` to all participants:

```js
socket.on('card_moved', ({ card }) => { ... });
```

### `add_comment` (client → server)

```js
socket.emit('add_comment', { cardId, content }, ack);
```

Broadcasts `comment_added`:

```js
socket.on('comment_added', ({ comment }) => { ... });
```

## Error handling

Mutating events validate that the socket has joined the board associated
with the target card/column. Validation failures return an error via the
acknowledgement callback and do not produce a broadcast.

## Reconnection model

Socket.io reconnects automatically. After a reconnect the client should
re-emit `join_board` and refetch the board over REST to recover from any
events missed while disconnected. The reference client does this in
`client/src/pages/BoardPage.jsx`.
