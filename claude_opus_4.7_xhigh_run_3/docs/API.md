# API Reference

The server exposes a small REST API for board lifecycle operations and a
Socket.io channel for real-time collaboration. By default it listens on
`http://localhost:4000`.

## REST Endpoints

All endpoints return JSON and use standard HTTP status codes. Errors look like
`{ "error": "<message>" }`.

### `GET /api/health`

Liveness probe. Returns `{ "ok": true }`.

### `POST /api/boards`

Create a new board. The server seeds three default columns ("Went Well",
"Needs Improvement", "Action Items").

```json
// Request body
{ "title": "Sprint 42 Retro" }

// 201 Created
{ "id": "XQQmYo6dUk2", "title": "Sprint 42 Retro", "createdAt": 1733...0 }
```

Errors: `400` when `title` is missing or longer than 120 characters.

### `GET /api/boards`

List all boards, newest first.

```json
[
  { "id": "...", "title": "Sprint 42 Retro", "createdAt": 1733...0 }
]
```

### `GET /api/boards/:id`

Fetch one board with its columns, cards, and comments nested.

```json
{
  "id": "XQQmYo6dUk2",
  "title": "Sprint 42 Retro",
  "createdAt": 1733...0,
  "columns": [
    {
      "id": "h7p_at9a7vbb",
      "boardId": "XQQmYo6dUk2",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "PInD_LwQeIHt",
          "columnId": "h7p_at9a7vbb",
          "content": "Pair sessions paid off",
          "authorName": "Alice",
          "createdAt": 1733...0,
          "position": 0,
          "comments": [
            {
              "id": "FMOR7zR_MpTB",
              "cardId": "PInD_LwQeIHt",
              "content": "+1",
              "authorName": "Bob",
              "createdAt": 1733...0
            }
          ]
        }
      ]
    }
  ]
}
```

Errors: `404` when the board does not exist.

### `POST /api/boards/:id/columns`

Add a new column to a board. The new column is appended at the end (highest
`position`).

```json
// Request body
{ "title": "Kudos" }

// 201 Created
{ "id": "MUwNHuOF6-4A", "boardId": "...", "title": "Kudos", "position": 3, "cards": [] }
```

Errors: `400` when `title` is missing or longer than 80 characters; `404` when
the board does not exist.

### `GET /api/boards/:id/export`

Stream a CSV export of the entire board (columns, cards, and comments) with a
`Content-Disposition: attachment; filename="<board>.csv"` header. The CSV has
one row per `(board, column, card, comment)` tuple plus header row. Empty
columns and card-without-comment rows are still included so the export reflects
the full board structure.

## Socket.io Events

The Socket.io endpoint shares the same HTTP server (`/socket.io/`). Each
connected client must join a board's room before sending or receiving updates.

Clients **emit** events with an optional acknowledgement callback:

```js
socket.emit('join_board', boardId, (ack) => {
  // ack is { ok: true } on success, or { ok: false, error: '...' }
});
```

The server **broadcasts** state changes to every socket in the board's room
(including the originator) so that all clients converge on the same state.

### `join_board` (client → server)

Payload: `boardId: string`. ACK: `{ ok: true }` or `{ ok: false, error: 'board_not_found' | 'invalid_board' }`.

### `leave_board` (client → server)

No payload. Leaves the current board room.

### `add_card` (client → server)

```ts
{ columnId: string, content: string, authorName: string }
```

ACK: `{ ok: true, card }` or `{ ok: false, error }`. On success the server emits `card_added` to the board room.

### `card_added` (server → clients)

```ts
{
  id: string;
  columnId: string;
  content: string;
  authorName: string;
  createdAt: number;   // epoch milliseconds
  position: number;
  boardId: string;
  comments: [];
}
```

### `move_card` (client → server)

```ts
{ cardId: string, targetColumnId: string, targetPosition: number }
```

ACK: `{ ok: true }` or `{ ok: false, error }`. The server rewrites the `position`
column for the affected source/target columns inside a single transaction.

### `card_moved` (server → clients)

```ts
{ cardId: string, fromColumnId: string, toColumnId: string, position: number }
```

### `add_comment` (client → server)

```ts
{ cardId: string, content: string, authorName: string }
```

ACK: `{ ok: true, comment }` or `{ ok: false, error }`. On success the server emits `comment_added`.

### `comment_added` (server → clients)

```ts
{
  id: string;
  cardId: string;
  content: string;
  authorName: string;
  createdAt: number;
  boardId: string;
}
```

## Limits & validation

| Field                 | Max length |
|-----------------------|------------|
| Board title           | 120        |
| Column title          | 80         |
| Card content          | 2000       |
| Comment content       | 1000       |
| Author display name   | 40         |

Display names are sanitized to trim whitespace and truncated to 40 characters.
Empty author names are stored as `"Anonymous"`.

## Data model

```sql
CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE board_columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  position INTEGER NOT NULL
);

CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

The database file lives at `$DATA_DIR/retro.sqlite` and runs with WAL journaling
and foreign keys enabled.
