# API Reference

The backend exposes a small REST surface for board CRUD plus a Socket.io
namespace for real-time card and comment events. All payloads are JSON.

## REST endpoints

Base path: `/api`

### `GET /api/boards`

List boards, newest first.

Response `200`:

```json
[
  { "id": "uuid", "title": "Sprint 42", "createdAt": "2026-06-26 13:43:48" }
]
```

### `POST /api/boards`

Create a new board. The server automatically seeds three default columns:
"Went Well", "Needs Improvement", "Action Items".

Request:

```json
{ "title": "Sprint 42 retrospective" }
```

Response `201`: a full `Board` (see [Types](#types)).

Errors: `400 { "error": "Title is required" }` when the title is empty or
exceeds 200 characters.

### `GET /api/boards/:id`

Fetch a board with all of its columns, cards, and comments.

Response `200`: a full `Board`. `404 { "error": "Board not found" }` if the
id is unknown.

### `POST /api/boards/:id/columns`

Append a new column to the board.

Request:

```json
{ "title": "Action Items" }
```

Response `201`: the newly created `Column` (with an empty `cards` array).

### `GET /api/cards/:id/comments`

List all comments for a card in order they were posted.

Response `200`:

```json
[
  {
    "id": "uuid",
    "cardId": "uuid",
    "content": "Agreed",
    "authorName": "Alice",
    "createdAt": "2026-06-26 13:44:54"
  }
]
```

### `GET /api/boards/:id/export`

Stream the board's contents as a CSV download. The response is
`Content-Type: text/csv` with a `Content-Disposition: attachment` header. Each
row has the columns:

```
type, column, card_content, card_author, card_created_at,
comment_content, comment_author, comment_created_at
```

`type` is one of `column` (empty column placeholder), `card`, or `comment`.

## Socket.io events

The client connects to the same origin (`io()`). Each event is acknowledged
with `{ ok: true, ... }` or `{ ok: false, error: string }`.

### Client → server

| Event         | Payload                                                                              | Effect                                                                 |
| ------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `join_board`  | `{ boardId, displayName }`                                                           | Subscribes the socket to the board room and returns the current board. |
| `leave_board` | `{ boardId }`                                                                        | Removes the socket from the room.                                      |
| `add_card`    | `{ boardId, columnId, content, authorName }`                                         | Persists a card and emits `card_added` to the room.                    |
| `move_card`   | `{ boardId, cardId, targetColumnId, targetIndex }`                                   | Re-positions the card and emits `card_moved` to the room.              |
| `add_comment` | `{ boardId, cardId, content, authorName }`                                           | Persists a comment and emits `comment_added` to the room.              |

### Server → client (broadcast within the board room)

| Event           | Payload                                                                              |
| --------------- | ------------------------------------------------------------------------------------ |
| `card_added`    | `{ card: Card }`                                                                     |
| `card_moved`    | `{ card: Card, sourceColumnId, targetColumnId, targetIndex }`                        |
| `comment_added` | `{ comment: Comment }`                                                               |

## Types

```ts
type Comment = {
  id: string;
  cardId: string;
  content: string;
  authorName: string;
  createdAt: string;
};

type Card = {
  id: string;
  columnId: string;
  content: string;
  authorName: string;
  position: number;
  createdAt: string;
  comments: Comment[];
};

type Column = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  cards: Card[];
};

type Board = {
  id: string;
  title: string;
  createdAt: string;
  columns: Column[];
};
```

## Storage

Boards, columns, cards, and comments live in a single SQLite file
(`$DATA_DIR/retro.sqlite`). Foreign keys cascade on delete, so removing a
board removes its columns, cards, and comments.

The database is opened with the built-in `node:sqlite` module and runs in
WAL mode for concurrent reads/writes.
