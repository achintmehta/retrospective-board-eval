# Retro Board API

The server speaks two protocols:

- **REST** for things that aren't latency-sensitive: creating boards, fetching board state, creating columns, exporting CSV.
- **Socket.io** (over WebSocket) for the real-time board interactions: joining a board room, adding cards, moving cards, adding comments.

All REST endpoints are rooted at `/api`. Socket.io is served from `/socket.io/`.

---

## REST

### `GET /api/health`

Liveness check.

**Response 200**
```json
{ "ok": true, "env": "development" }
```

### `GET /api/boards`

List all boards, newest first.

**Response 200**
```json
[
  {
    "id": "a1c0e8d2-...",
    "title": "Sprint 42 Retro",
    "created_at": 1728912345678
  }
]
```

### `POST /api/boards`

Create a board with three default columns (*Went Well*, *Needs Improvement*, *Action Items*).

**Body**
```json
{ "title": "Sprint 42 Retro" }
```

**Response 201**
```json
{
  "id": "a1c0e8d2-...",
  "title": "Sprint 42 Retro",
  "created_at": 1728912345678
}
```

**Errors**
- `400 { "error": "title is required" }` — empty/missing title
- `400 { "error": "title too long" }` — title > 200 chars

### `GET /api/boards/:id`

Get a single board with its columns, cards (each in column order), and per-card comments (in chronological order).

**Response 200**
```json
{
  "id": "a1c0e8d2-...",
  "title": "Sprint 42 Retro",
  "created_at": 1728912345678,
  "columns": [
    {
      "id": "col-uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "card-uuid",
          "column_id": "col-uuid",
          "content": "We shipped on time!",
          "author_name": "Alice",
          "created_at": 1728912445678,
          "position": 0,
          "comments": [
            {
              "id": "cm-uuid",
              "card_id": "card-uuid",
              "content": "Nice!",
              "author_name": "Bob",
              "created_at": 1728912545678
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors**
- `404 { "error": "Board not found" }`

### `POST /api/boards/:id/columns`

Append a new column to a board. The new column's `position` is the previous max position + 1.

When connected Socket.io clients are in the board's room, a `column_added` event is broadcast so all open boards see the new column immediately.

**Body**
```json
{ "title": "Risks" }
```

**Response 201**
```json
{
  "id": "col-uuid",
  "board_id": "a1c0e8d2-...",
  "title": "Risks",
  "position": 3,
  "cards": []
}
```

**Errors**
- `400 { "error": "title is required" }` — empty/missing title
- `400 { "error": "title too long" }` — title > 100 chars
- `404 { "error": "Board not found" }`

### `GET /api/boards/:id/export`

Stream the board contents as CSV. The header row is:

```
Column,Card Content,Card Author,Card Created At,Comment Content,Comment Author,Comment Created At
```

- One row per *card × comment* combination.
- A card with no comments produces a single row with empty comment columns.
- Timestamps are ISO 8601 UTC.
- Values containing commas, quotes, or newlines are quoted with `"` and internal quotes are doubled (`""`).

Response headers include `Content-Disposition: attachment; filename="<sanitized-title>.csv"`.

**Errors**
- `404 { "error": "Board not found" }`

---

## Socket.io

Every event uses an *ack callback* — the second-to-last positional argument is the payload, and the last is a callback `(ack) => void` where `ack` is `{ ok: true, ...data } | { ok: false, error: string }`.

### Connection

```js
import { io } from 'socket.io-client';
const socket = io(); // dev server is proxied; production hits the backend directly
```

### `join_board` (client → server)

Required before any other event. The server attaches the display name to the socket, adds the socket to the board's room, and validates the board exists.

```js
socket.emit('join_board', { boardId, displayName: 'Alice' }, (ack) => {
  if (ack.ok) console.log('joined', ack.board);
});
```

**Ack on success**
```json
{ "ok": true, "board": { "id": "...", "title": "...", "created_at": 123 } }
```

**Ack on failure**
- `displayName required` — missing or empty/too long (>60)
- `Board not found`
- `boardId required`

### `leave_board` (client → server)

Optional cleanup. The client automatically leaves on disconnect.

```js
socket.emit('leave_board', { boardId });
```

### `add_card` (client → server)

Creates a card in the given column, broadcasts `card_added` to the room.

```js
socket.emit('add_card', {
  boardId,
  columnId,
  content: 'We shipped on time!',
}, (ack) => {});
```

**Ack on success**
```json
{ "ok": true, "card": { "id": "...", "column_id": "...", "content": "...", "author_name": "Alice", "created_at": 123, "position": 0, "comments": [] } }
```

**Ack errors**
- `Join board first` — socket has no display name
- `Not in board room`
- `content required`
- `Column not found`

### `move_card` (client → server)

Move a card to a target column at a target index. Positions for all affected cards are renumbered atomically.

```js
socket.emit('move_card', {
  boardId,
  cardId,
  targetColumnId,
  targetIndex: 0,
}, (ack) => {});
```

The server broadcasts `card_moved` to the room. The current implementation has clients refetch the full board on receipt for guaranteed consistency.

**Ack errors**
- `Join board first`
- `Not in board room`
- `Card or column not found` (or cross-board move attempt)

### `add_comment` (client → server)

```js
socket.emit('add_comment', {
  boardId,
  cardId,
  content: 'Nice!',
}, (ack) => {});
```

The server broadcasts `comment_added` to the room.

**Ack errors**
- `Join board first`
- `Not in board room`
- `content required`
- `Card not found`

### Server → client events

All include the `boardId` so clients sharing the socket across boards can filter.

| Event           | Payload                                                                                       |
|-----------------|-----------------------------------------------------------------------------------------------|
| `card_added`    | `{ boardId, card }`                                                                            |
| `card_moved`    | `{ boardId, cardId, sourceColumnId, targetColumnId, targetIndex }`                             |
| `comment_added` | `{ boardId, comment }` where comment includes `card_id`                                        |
| `column_added`  | `{ boardId, column }` (broadcast when a column is created via REST `POST /boards/:id/columns`) |

## Data model

| Table           | Columns                                                                          |
|-----------------|-----------------------------------------------------------------------------------|
| `boards`        | `id TEXT PK`, `title TEXT`, `created_at INTEGER`                                  |
| `board_columns` | `id TEXT PK`, `board_id TEXT FK`, `title TEXT`, `position INTEGER`                |
| `cards`         | `id TEXT PK`, `column_id TEXT FK`, `content TEXT`, `author_name TEXT`, `created_at INTEGER`, `position INTEGER` |
| `comments`      | `id TEXT PK`, `card_id TEXT FK`, `content TEXT`, `author_name TEXT`, `created_at INTEGER`     |

WAL mode is enabled. Foreign keys are on with `ON DELETE CASCADE` so dropping a board takes its columns/cards/comments with it.

## Limits & validation

| Field             | Max length |
|-------------------|------------|
| Board title       | 200        |
| Column title      | 100        |
| Card content      | 2000       |
| Comment content   | 2000       |
| Display name      | 60         |

JSON request bodies are limited to 256 KB.
