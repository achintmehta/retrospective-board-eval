# API Reference

The server exposes a small REST surface plus a Socket.io channel for real-time collaboration.

- Base HTTP path: `/api`
- WebSocket transport: Socket.io, same origin as HTTP (`/socket.io`)

All bodies are JSON. All identifiers are RFC 4122 v4 UUIDs.

---

## REST

### `POST /api/boards`

Create a new board. Three default columns are seeded.

Request:

```json
{ "title": "Sprint 14 Retro" }
```

Response `201`:

```json
{
  "id": "fcc...",
  "title": "Sprint 14 Retro",
  "created_at": 1733000000000,
  "columns": [ /* default columns */ ],
  "cards": [],
  "comments": []
}
```

### `GET /api/boards`

List all boards, newest first.

Response `200`:

```json
[
  { "id": "...", "title": "Sprint 14 Retro", "created_at": 1733000000000 }
]
```

### `GET /api/boards/:id`

Fetch a board with all its columns, cards, and comments.

Response `200`:

```json
{
  "id": "...",
  "title": "...",
  "created_at": 1733000000000,
  "columns": [
    { "id": "...", "board_id": "...", "title": "Went Well", "position": 0 }
  ],
  "cards": [
    {
      "id": "...",
      "column_id": "...",
      "content": "...",
      "author_name": "Alice",
      "created_at": 1733000000001,
      "position": 0
    }
  ],
  "comments": [
    {
      "id": "...",
      "card_id": "...",
      "content": "...",
      "author_name": "Alice",
      "created_at": 1733000000002
    }
  ]
}
```

`404` if the board does not exist.

### `POST /api/boards/:id/columns`

Append a new column at the next position.

Request:

```json
{ "title": "Action Items" }
```

Response `201`:

```json
{ "id": "...", "board_id": "...", "title": "Action Items", "position": 3 }
```

### `GET /api/boards/:id/export`

Stream the full board contents as a CSV download.

- Response `200` with `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="<title>-<short-id>.csv"`
- Columns: `Column, Card, Author, Created At, Comment, Comment Author, Comment Created At`
- Empty columns emit a single placeholder row; cards without comments emit one row; cards with comments emit one row per comment.

---

## WebSocket events

Open a Socket.io connection to the server (same origin). Every collaborative mutation goes through the socket — the REST API only seeds the board.

Each client-emitted event accepts an optional ack callback: `(payload, ack) => ack({ ... })`. Server responses include either the persisted entity or an `{ error }` field.

### Client → Server

#### `join_board`

```js
socket.emit('join_board', { boardId, displayName }, (resp) => {
  // resp.board: full board on success
  // resp.error: string on failure
});
```

Joins the board's room and returns the full board state for initial render. Required before emitting any other event.

#### `add_card`

```js
socket.emit('add_card', { columnId, content, authorName }, ack);
```

Persists a new card at the end of the column and broadcasts `card_added`. `authorName` defaults to the display name from `join_board` when omitted.

#### `move_card`

```js
socket.emit('move_card', { cardId, toColumnId, position }, ack);
```

Updates the card's column and floating-point position, then broadcasts `card_moved`. Position is computed client-side as the midpoint between neighbors.

#### `add_comment`

```js
socket.emit('add_comment', { cardId, content, authorName }, ack);
```

Persists a comment and broadcasts `comment_added`.

### Server → Client

| Event           | Payload                       |
| --------------- | ----------------------------- |
| `card_added`    | `{ card: Card }`              |
| `card_moved`    | `{ card: Card }`              |
| `comment_added` | `{ comment: Comment }`        |

Events are scoped to `board:<boardId>` — clients only receive updates for boards they have joined.

---

## Data model

```ts
type Board = {
  id: string;
  title: string;
  created_at: number;   // ms epoch
};

type Column = {
  id: string;
  board_id: string;
  title: string;
  position: number;
};

type Card = {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: number;
  position: number;     // fractional; ordering is ASC
};

type Comment = {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: number;
};
```

---

## Errors

REST endpoints return JSON `{ "error": "message" }` with appropriate HTTP status codes:

| Status | When                                            |
| ------ | ----------------------------------------------- |
| `400`  | Missing required field (e.g. blank title)       |
| `404`  | Board, column, or card not found                |

Socket events deliver errors through the ack callback: `ack({ error: "..." })`.
