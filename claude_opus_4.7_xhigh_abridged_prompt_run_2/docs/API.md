# API reference

Retro exposes two protocol surfaces:

- A small **REST API** for board CRUD, initial state hydration, and CSV export
- A **WebSocket (Socket.io) API** for the real-time editing loop (cards,
  moves, comments, presence)

All REST endpoints are mounted under `/api`. All WebSocket traffic is served on
the same host under the default Socket.io path `/socket.io`.

---

## REST

### `GET /api/health`

Returns a small liveness payload used by the dev bootstrap and Docker
healthchecks.

```json
{ "ok": true, "version": "1.0.0" }
```

### `POST /api/boards`

Creates a new board. The board is automatically seeded with three default
columns: **Went Well**, **Needs Improvement**, and **Action Items**.

Request body:

```json
{ "title": "Sprint 42 Retro" }
```

Response `201 Created`:

```json
{
  "id": "pYE2C_-X-X",
  "title": "Sprint 42 Retro",
  "created_at": 1782991935854
}
```

### `GET /api/boards`

Lists all boards, newest first.

Response `200 OK`:

```json
[
  { "id": "pYE2C_-X-X", "title": "Sprint 42 Retro", "created_at": 1782991935854 }
]
```

### `GET /api/boards/:id`

Returns the entire board — columns, cards, and comments — in one call. This is
what the client uses to hydrate state on join (and on reconnect).

Response `200 OK`:

```json
{
  "id": "pYE2C_-X-X",
  "title": "Sprint 42 Retro",
  "created_at": 1782991935854,
  "columns": [
    {
      "id": "eSGz3wOB-e",
      "board_id": "pYE2C_-X-X",
      "title": "Went Well",
      "position": 0,
      "created_at": 1782991935854,
      "cards": [
        {
          "id": "jLz4SF1fbA",
          "column_id": "eSGz3wOB-e",
          "content": "Deployment pipeline is 3x faster",
          "author_name": "Alice",
          "position": 0,
          "created_at": 1782991968579,
          "comments": [
            {
              "id": "1Kq3f7uq-r",
              "card_id": "jLz4SF1fbA",
              "content": "Kudos to the release team!",
              "author_name": "Bob",
              "created_at": 1782991968800
            }
          ]
        }
      ]
    }
  ]
}
```

Errors: `404 Not Found` if no board matches the id.

### `POST /api/boards/:id/columns`

Adds a new column to the board. The new column is appended at the end of the
column list (highest `position`). Broadcasts `column_added` to every client
subscribed to the board's room.

Request body:

```json
{ "title": "Kudos" }
```

Response `201 Created`:

```json
{
  "id": "zXmz0K0MY0",
  "board_id": "pYE2C_-X-X",
  "title": "Kudos",
  "position": 3,
  "created_at": 1782991936075
}
```

Errors:
- `400 Bad Request` if `title` is missing or blank
- `404 Not Found` if the board doesn't exist

### `GET /api/boards/:id/export`

Streams a CSV file containing every card and comment on the board.

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="<sanitized-title>.csv"`

The CSV has the columns `type,column,content,author,created_at,parent_card_content`.
Comments repeat their parent card's content in the last column so pivoting in a
spreadsheet is trivial.

---

## WebSocket (Socket.io)

The client opens a Socket.io connection to the same origin and, once
connected, emits `join_board` with the board's id and its chosen display name.
Every subsequent event is scoped to that board's room.

The socket uses acknowledgement callbacks for **client → server** events —
the server responds with either `{ ok: true, ... }` or `{ error: string }`.

### Wire protocol constants

Event names are shared between the server (`server/src/realtime/events.ts`)
and the client (`client/src/hooks/useBoardSocket.ts`).

| Constant         | Wire name        | Direction        |
| ---------------- | ---------------- | ---------------- |
| `JOIN_BOARD`     | `join_board`     | Client → Server  |
| `LEAVE_BOARD`    | `leave_board`    | Client → Server  |
| `ADD_CARD`       | `add_card`       | Client → Server  |
| `MOVE_CARD`      | `move_card`      | Client → Server  |
| `ADD_COMMENT`    | `add_comment`    | Client → Server  |
| `CARD_ADDED`     | `card_added`     | Server → Client  |
| `CARD_MOVED`     | `card_moved`     | Server → Client  |
| `COMMENT_ADDED`  | `comment_added`  | Server → Client  |
| `COLUMN_ADDED`   | `column_added`   | Server → Client  |
| `PRESENCE`       | `presence`       | Server → Client  |

### Client → Server

#### `join_board`

Joins the board's presence room. The ack payload includes the entire board
state so clients don't need to make an extra REST call after connecting.

```ts
socket.emit(
  'join_board',
  { boardId: string, displayName: string },
  (resp: { ok?: true; board?: BoardWithChildren; error?: string }) => { … }
);
```

Server behaviour:
- If `boardId` doesn't exist → `{ error: 'Board not found' }`
- If the socket was already in another board room, it leaves that room first
- Broadcasts a `presence` update to the board room

#### `leave_board`

```ts
socket.emit('leave_board', { boardId: string });
```

Removes the socket from the room and broadcasts an updated `presence` list.
`disconnect` also triggers this cleanup automatically.

#### `add_card`

```ts
socket.emit(
  'add_card',
  { boardId, columnId, content, authorName },
  (resp) => { … }
);
```

Server behaviour:
- Rejects if `columnId` does not belong to `boardId`
- Rejects if `content` is empty after trimming
- Persists the card and broadcasts `card_added` to the board room

#### `move_card`

```ts
socket.emit(
  'move_card',
  { boardId, cardId, targetColumnId, targetIndex },
  (resp) => { … }
);
```

Server behaviour:
- Rejects if `cardId` or `targetColumnId` don't belong to `boardId`
- Renumbers positions in the source column (to close the gap) and in the
  target column (to open a slot at `targetIndex`)
- Clamps `targetIndex` into `[0, targetColumn.cards.length]`
- Broadcasts `card_moved` with the updated card and the original column id

#### `add_comment`

```ts
socket.emit(
  'add_comment',
  { boardId, cardId, content, authorName },
  (resp) => { … }
);
```

Server behaviour:
- Rejects if `cardId` does not belong to `boardId`
- Rejects if `content` is empty after trimming
- Persists the comment and broadcasts `comment_added` to the board room

### Server → Client (broadcasts)

Every broadcast is sent to every socket currently in the board's room —
including the sender. The client is expected to reconcile these updates into
its board state (see `client/src/hooks/useBoardSocket.ts`).

#### `card_added`

```ts
{ card: CardRow, comments: [] }
```

#### `card_moved`

```ts
{
  card: CardRow,           // with updated column_id and position
  sourceColumnId: string,  // the column the card was in before the move
  targetIndex: number
}
```

#### `comment_added`

```ts
CommentRow
```

#### `column_added`

```ts
BoardColumnRow
```

#### `presence`

```ts
{ boardId: string, users: string[] }   // deduplicated display names
```

---

## Data model

| Table            | Columns                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `boards`         | `id`, `title`, `created_at`                                              |
| `board_columns`  | `id`, `board_id` (FK), `title`, `position`, `created_at`                 |
| `cards`          | `id`, `column_id` (FK), `content`, `author_name`, `position`, `created_at` |
| `comments`       | `id`, `card_id` (FK), `content`, `author_name`, `created_at`             |

All ids are 10-character URL-safe strings (`nanoid`). All timestamps are
millisecond epochs.

Foreign keys use `ON DELETE CASCADE`, so deleting a board would cleanly delete
its columns, cards, and comments — but the app currently does not expose a
delete endpoint. Delete `data/retro.sqlite` (server stopped) to wipe.
