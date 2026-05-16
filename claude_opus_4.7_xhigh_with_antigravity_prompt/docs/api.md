# API Reference

The server exposes two interfaces:

- **REST** under `/api/*` — used for board lifecycle, fetching state, column
  creation, and CSV export.
- **WebSocket** (Socket.io) — used for all real-time collaborative events
  (joining a board, adding cards/comments, moving cards).

All bodies are JSON unless otherwise noted. Timestamps are millisecond Unix
epochs. IDs are URL-safe nanoid-12 strings.

## REST

### `GET /api/health`

Returns `{ "ok": true, "time": <ms> }`. Used for liveness probes.

### `POST /api/boards`

Create a new board. Three default columns (`Went Well`, `Needs Improvement`,
`Action Items`) are seeded.

```http
POST /api/boards
Content-Type: application/json

{ "title": "Sprint 42 Retro" }
```

**Response `201`** — full board object (see [`GET /api/boards/:id`](#get-apiboardsid)).

**Errors**: `400` if `title` is missing, blank, or longer than 120 chars.

### `GET /api/boards`

List all boards (newest first). Includes aggregate counts.

```json
[
  {
    "id": "abc123…",
    "title": "Sprint 42 Retro",
    "createdAt": 1700000000000,
    "cardCount": 12,
    "commentCount": 5
  }
]
```

### `GET /api/boards/:id`

Fetch a board with its columns, cards, and comments.

```json
{
  "id": "abc123…",
  "title": "Sprint 42 Retro",
  "createdAt": 1700000000000,
  "columns": [
    {
      "id": "col_…",
      "boardId": "abc123…",
      "title": "Went Well",
      "position": 0,
      "createdAt": 1700000000000,
      "cards": [
        {
          "id": "card_…",
          "columnId": "col_…",
          "content": "we shipped on time",
          "authorName": "Alice",
          "position": 0,
          "createdAt": 1700000001000,
          "comments": [
            {
              "id": "cm_…",
              "cardId": "card_…",
              "content": "great call",
              "authorName": "Bob",
              "createdAt": 1700000002000
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors**: `404` if the board does not exist.

### `POST /api/boards/:id/columns`

Append a new column. The new column's `position` is `max(position) + 1`.

```http
POST /api/boards/abc123/columns
Content-Type: application/json

{ "title": "Kudos" }
```

**Response `201`** — the created column with `cards: []`.

**Errors**: `400` blank/over-long title, `404` board not found.

### `GET /api/boards/:id/export`

Stream a CSV file of the board's contents.

- `Content-Type: text/csv; charset=utf-8`
- `Content-Disposition: attachment; filename="retro_<title>_<id>.csv"`

The CSV has one row per card and one row per comment. Columns:

| Column        | Notes                                         |
| ------------- | --------------------------------------------- |
| `type`        | `card` or `comment`                           |
| `board`       | Board title                                    |
| `column`      | Column title                                   |
| `position`    | Card position (blank for comments)            |
| `content`     | Card or comment text                           |
| `author`      | Author display name                            |
| `created_at`  | ISO-8601 timestamp                             |
| `parent_card` | Card ID for a comment (blank for cards)       |

**Errors**: `404` board not found.

## WebSocket (Socket.io)

The Socket.io endpoint lives at `/socket.io` (default Socket.io path), on the
same origin as the HTTP server. Use [`socket.io-client`](https://socket.io/docs/v4/client-api/).

### Lifecycle

1. Connect: `io()` (the included client uses websocket then polling).
2. Emit `join_board` to enter the board's room.
3. Listen for broadcast events. Issue mutating events as actions occur.
4. On reconnect, the client should re-emit `join_board` and refetch
   `GET /api/boards/:id` to reconcile state. The included React client does
   this automatically.

### Acknowledgements

All emit events accept an ack callback shaped like `{ ok: true, ... }` on
success or `{ ok: false, error: "<message>" }` on failure.

### Client → Server events

#### `join_board`

```js
socket.emit('join_board', { boardId, displayName }, (ack) => { ... });
```

Joins the room `board:<boardId>`. The display name is associated with the
socket and used as the author of subsequent cards/comments. Other members of
the room receive a `presence_joined` event.

#### `add_card`

```js
socket.emit('add_card', { boardId, columnId, content }, (ack) => { ... });
// ack: { ok: true, card: { id, columnId, content, authorName, position, createdAt, comments: [] } }
```

The server inserts the card at the end of the column, then broadcasts
`card_added` to the room (sender included).

#### `move_card`

```js
socket.emit('move_card', { cardId, toColumnId, toIndex }, (ack) => { ... });
```

Move `cardId` to `toColumnId` at `toIndex` (0-based, after removing the card
from its source column). Card positions are renumbered densely. The server
broadcasts `card_moved` with both source and destination orders.

#### `add_comment`

```js
socket.emit('add_comment', { cardId, content }, (ack) => { ... });
// ack: { ok: true, comment: { id, cardId, content, authorName, createdAt } }
```

Server broadcasts `comment_added`.

### Server → Client events

| Event             | Payload                                                                                                                     | Meaning                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `card_added`      | `{ columnId, card }`                                                                                                        | A new card was added to a column.                |
| `card_moved`      | `{ cardId, sourceColumnId, destinationColumnId, sourceOrder: string[], destinationOrder: string[], card }` | A card was moved; orders are the new card-id arrays per column. |
| `comment_added`   | `{ cardId, comment }`                                                                                                        | A new comment was added to a card.               |
| `column_added`    | `{ column }`                                                                                                                | Broadcast after a successful `POST /api/boards/:id/columns`. |
| `presence_joined` | `{ displayName }`                                                                                                            | Another user joined the board.                   |
| `presence_left`   | `{ displayName }`                                                                                                            | Another user left the board.                     |

### Error model

Validation errors (blank content, missing fields) yield `{ ok: false, error }`
on the ack and **do not broadcast**. Internal errors are logged on the server
and the client receives `{ ok: false, error: "Internal server error" }`.
