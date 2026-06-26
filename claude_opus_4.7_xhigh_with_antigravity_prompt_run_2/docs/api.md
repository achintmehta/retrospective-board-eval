# API Reference

The backend exposes two surfaces:

1. **REST** at `/api/*` — for board lifecycle, snapshot fetches, and export.
2. **Socket.io** at `/socket.io` — for real-time card, comment, and movement events.

All requests/responses use JSON unless noted otherwise. Timestamps are unix
millisecond integers (UTC).

## REST endpoints

### `GET /api/health`

Liveness probe.

**Response 200**

```json
{ "ok": true }
```

### `POST /api/boards`

Create a new retrospective board. The server seeds three default columns:
"Went Well", "Needs Improvement", "Action Items".

**Request body**

```json
{ "title": "Sprint 42 Retro" }
```

**Response 201**

```json
{
  "id": "abc123XYZ",
  "title": "Sprint 42 Retro",
  "created_at": 1719360000000
}
```

**Errors**

- `400 Bad Request` — `title` missing or > 120 chars.

### `GET /api/boards`

List boards, newest first.

**Response 200**

```json
[
  { "id": "abc123XYZ", "title": "Sprint 42 Retro", "created_at": 1719360000000 }
]
```

### `GET /api/boards/:id`

Fetch a board snapshot with full nested state.

**Response 200**

```json
{
  "id": "abc123XYZ",
  "title": "Sprint 42 Retro",
  "created_at": 1719360000000,
  "columns": [
    {
      "id": "col1",
      "board_id": "abc123XYZ",
      "title": "Went Well",
      "position": 0,
      "created_at": 1719360000001,
      "cards": [
        {
          "id": "card1",
          "column_id": "col1",
          "content": "Shipped early!",
          "author_name": "Mira",
          "position": 0,
          "created_at": 1719360100000,
          "comments": [
            {
              "id": "cmt1",
              "card_id": "card1",
              "content": "🔥 huge win",
              "author_name": "Aaron",
              "created_at": 1719360200000
            }
          ]
        }
      ]
    }
  ]
}
```

**Errors**

- `404 Not Found` — board id does not exist.

### `POST /api/boards/:id/columns`

Add a new column to a board. The new column is appended after the highest
existing `position`.

**Request body**

```json
{ "title": "Action Items" }
```

**Response 201**

```json
{
  "id": "col2",
  "board_id": "abc123XYZ",
  "title": "Action Items",
  "position": 3,
  "created_at": 1719360300000
}
```

**Errors**

- `400 Bad Request` — `title` missing or > 80 chars.
- `404 Not Found` — board id does not exist.

### `GET /api/boards/:id/export`

Stream the board as CSV. Each row contains one `(column, card, comment)`
triple; empty columns/cards still produce a row so the export is lossless.

**Response 200**

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="retro-sprint-42-retro-abc123XYZ.csv"
```

CSV columns:

| Column                | Notes                                            |
| --------------------- | ------------------------------------------------ |
| `board_id`            | Board identifier                                 |
| `board_title`         | Board title                                      |
| `column_position`     | 0-indexed                                        |
| `column_title`        |                                                  |
| `card_position`       | 0-indexed within column                          |
| `card_id`             |                                                  |
| `card_author`         | Display name of card author                      |
| `card_created_at`     | ISO 8601                                         |
| `card_content`        | Newlines preserved; embedded quotes are escaped  |
| `comment_id`          | Empty if card has no comments                    |
| `comment_author`      |                                                  |
| `comment_created_at`  | ISO 8601                                         |
| `comment_content`     |                                                  |

**Errors**

- `404 Not Found` — board id does not exist.

## Socket.io protocol

Endpoint: `/socket.io` (default).

A client must `join_board` before emitting any mutation events. The server
enforces this — all mutation events are no-ops with `{ ok: false }` acks until
the socket has joined.

All events accept an optional acknowledgement callback `(ack) => void`. The
ack shape is `{ ok: boolean, error?: string, ...payload }`.

### Client → Server

#### `join_board`

```ts
emit('join_board', { boardId: string, displayName: string }, (ack) => {...})
// ack: { ok: true } | { ok: false, error: string }
```

Joins the room `board:<boardId>`. The display name is stored on the socket and
used for any subsequent card or comment authored by this client. Server-side
the name is trimmed and capped at 60 characters.

#### `add_card`

```ts
emit('add_card', { boardId, columnId, content }, (ack) => {...})
// ack: { ok: true, card } | { ok: false, error }
```

#### `move_card`

```ts
emit('move_card', { boardId, cardId, toColumnId, toIndex }, (ack) => {...})
// ack: { ok: true } | { ok: false, error }
```

`toIndex` is 0-indexed within the target column. Out-of-range values are
clamped server-side.

#### `add_comment`

```ts
emit('add_comment', { boardId, cardId, content }, (ack) => {...})
// ack: { ok: true, comment } | { ok: false, error }
```

#### `column_created`

```ts
emit('column_created', { boardId, column })
```

Best-effort relay so peers receive new columns instantly. The originating
client already added the column via REST.

### Server → Clients in the room

| Event           | Payload                                                              |
| --------------- | -------------------------------------------------------------------- |
| `card_added`    | `{ card }`                                                           |
| `card_moved`    | `{ cardId, fromColumnId, toColumnId, toIndex }`                      |
| `comment_added` | `{ cardId, comment }`                                                |
| `column_added`  | `{ column }` (forwarded from `column_created`)                       |
| `presence`      | `{ count }` — number of active sockets in the room                   |

### Reconnection

`socket.io-client` reconnects automatically. The board page detects status
changes via its `useBoardSocket` hook and refetches the full board snapshot
on any move failure so the local state can never drift past the next event.

## Validation & limits

| Field             | Limit      |
| ----------------- | ---------- |
| Board title       | 120 chars  |
| Column title      | 80 chars   |
| Card content      | 1000 chars |
| Comment content   | 1000 chars |
| Display name      | 60 chars   |
| Request body size | 256 KB     |

All text fields are trimmed before persistence. Empty strings are rejected.
