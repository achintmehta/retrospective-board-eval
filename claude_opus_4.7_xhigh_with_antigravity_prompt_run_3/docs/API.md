# API Reference

The server exposes two surfaces:

- **REST API** at `/api/*` — used for one-shot operations (list/create
  boards, fetch a board, create columns, export CSV).
- **Socket.io WebSocket** at the default `/socket.io/` path — used for all
  realtime mutations and broadcasts (cards and comments).

All bodies and responses are JSON unless otherwise noted. Errors come back as
`{ "error": "human-readable message" }` with the appropriate HTTP status.

---

## REST

### `GET /api/boards`
List boards, newest first.

```json
[
  { "id": "G7J3NS47Ll", "title": "Sprint 27", "created_at": "2026-06-26 12:01:42" }
]
```

### `POST /api/boards`
Create a board.

| Field   | Type                          | Required | Notes                                                                 |
| ------- | ----------------------------- | -------- | --------------------------------------------------------------------- |
| title   | string (1–120 chars)          | yes      |                                                                       |
| columns | `Array<{title:string}>` (≤60c)| no       | When omitted, defaults to `Went Well / Needs Improvement / Action Items`. |

```bash
curl -X POST http://localhost:4000/api/boards \
  -H "Content-Type: application/json" \
  -d '{"title":"Sprint 27","columns":[{"title":"Liked"},{"title":"Lacked"}]}'
```

Returns `201` with the new board record.

### `GET /api/boards/:id`
Fetch a board with all of its columns, cards, and comments — used for the
initial hydration of the board page.

```json
{
  "board":    { "id": "G7J3NS47Ll", "title": "Sprint 27", "created_at": "…" },
  "columns":  [ { "id": 1, "board_id": "G7J3NS47Ll", "title": "…", "position": 0 } ],
  "cards":    [ { "id": 1, "column_id": 1, "content": "…", "author_name": "…", "position": 0, "created_at": "…" } ],
  "comments": [ { "id": 1, "card_id": 1, "content": "…", "author_name": "…", "created_at": "…" } ]
}
```

Returns `404` if the board id is unknown.

### `POST /api/boards/:id/columns`
Append a new column to a board. The new column is also broadcast over
Socket.io as `column_added`, so any open clients see it without refreshing.

```json
{ "title": "Action Items" }
```

Returns `201` with the new column record (`{ id, board_id, title, position, created_at }`).

### `GET /api/boards/:id/export`
Stream a CSV download of the board.

Columns: `column`, `card_position`, `card_author`, `card_content`,
`card_created_at`, `comment_author`, `comment_content`, `comment_created_at`.

- One row per `(card, comment)` pair — cards without comments emit a single
  row with the comment fields empty.
- Columns with no cards still appear as a placeholder row so the export
  reflects the full board layout.
- The response sets `Content-Type: text/csv; charset=utf-8` and
  `Content-Disposition: attachment; filename="retro-<slug>.csv"`. A UTF-8 BOM
  is prepended so Excel detects the encoding correctly.

---

## Socket.io

The client connects to the same origin and authenticates with a display
name on `join_board`. There is no persistent session — closing the tab
ends the session.

### Client → server

| Event         | Payload                                                                                                  | Effect                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `join_board`  | `{ board_id: string, display_name: string }`                                                             | Joins the `board:<id>` Socket.io room. Required before any mutation.                         |
| `leave_board` | `{ board_id: string }`                                                                                   | Leaves the room.                                                                             |
| `add_card`    | `{ board_id, column_id: number, content: string (1–500c), author_name?: string }`                        | Inserts a card at the bottom of the column. Broadcasts `card_added`.                         |
| `move_card`   | `{ board_id, card_id: number, from_column_id: number, to_column_id: number, to_position: number }`       | Reorders/moves a card. Broadcasts `card_moved` (and `column_reordered` for cross-col moves). |
| `add_comment` | `{ board_id, card_id: number, content: string (1–1000c), author_name?: string }`                         | Adds a comment under a card. Broadcasts `comment_added`.                                     |

The server validates each payload (board membership, column/card ownership,
length limits) and emits an `error_message` with a human-readable reason on
rejection — the connection is **not** closed.

### Server → client

| Event              | Payload                                                                                          | When                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `user_joined`      | `{ display_name }`                                                                               | Another user joined the room.                                     |
| `column_added`     | full column record                                                                               | A new column was created (REST or socket trigger).                |
| `card_added`       | full card record                                                                                 | A card was added to the board.                                    |
| `card_moved`       | `{ card_id, from_column_id, to_column_id, ordered_cards: [{id, position}], source_ordered_cards }` | A card moved within or between columns. `ordered_cards` is the new ordering of the destination column. |
| `column_reordered` | `{ column_id, ordered_cards: [{id, position}] }`                                                 | After a cross-column move, the source column&rsquo;s authoritative order. |
| `comment_added`    | full comment record                                                                              | A comment was added to a card.                                    |
| `error_message`    | `{ message: string }`                                                                            | Validation or authorization failed for the most recent action.    |

### Reconnection

`socket.io-client` reconnects automatically with exponential backoff. The
frontend always refetches `/api/boards/:id` after reconnecting to guarantee
the local state matches the server snapshot — there is no
operation-log replay protocol.

---

## Data model

```text
boards (id PK, title, created_at)
  └── board_columns (id PK, board_id FK, title, position, created_at)
        └── cards (id PK, column_id FK, content, author_name, position, created_at)
              └── comments (id PK, card_id FK, content, author_name, created_at)
```

All foreign keys cascade on delete, so dropping a board cleans up its
columns, cards, and comments atomically. `position` is a dense integer
ordering recomputed inside a transaction whenever a card moves.

## Limits and validation

| Field            | Max length |
| ---------------- | ---------- |
| Board title      | 120 chars  |
| Column title     | 60 chars   |
| Card content     | 500 chars  |
| Comment content  | 1000 chars |
| Display name     | 60 chars   |

All limits are enforced at the boundary (HTTP route or socket handler) —
anything over the limit is rejected with `400` or an `error_message`.
