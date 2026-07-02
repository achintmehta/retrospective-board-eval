# API Reference

The server exposes a small REST surface for CRUD-adjacent operations plus a Socket.io channel for real-time collaboration. REST is used to fetch board state and mutate structural elements (boards, columns) that don't need broadcast semantics. Socket.io is used for high-frequency, collaborative writes (cards, moves, comments).

- **Base URL (dev):** `http://localhost:4000`
- **Base URL (prod):** whatever host the container is exposed on
- **Content type:** `application/json` for REST; JSON payloads over Socket.io

---

## REST endpoints

### `GET /api/health`
Liveness probe.

**200**
```json
{ "ok": true, "uptime": 12.34 }
```

### `GET /api/boards`
List every board, newest first.

**200**
```json
[
  { "id": "abc123", "title": "Sprint 42", "created_at": 1730000000000 }
]
```

### `POST /api/boards`
Create a new board. Automatically seeds three default columns: *Went Well*, *Needs Improvement*, *Action Items*.

**Body**
```json
{ "title": "Sprint 42 Retrospective" }
```

- `title`: required, 1–120 chars.

**201** — returns the created board (no columns embedded; fetch `GET /api/boards/:id` for full state).

**400** — `title is required` / `title too long (max 120 chars)`.

### `GET /api/boards/:id`
Full board — columns, cards, comments — assembled server-side.

**200**
```json
{
  "id": "abc123",
  "title": "Sprint 42",
  "created_at": 1730000000000,
  "columns": [
    {
      "id": "col1",
      "board_id": "abc123",
      "title": "Went Well",
      "position": 0,
      "created_at": 1730000000000,
      "cards": [
        {
          "id": "card1",
          "column_id": "col1",
          "content": "Deploys were smooth.",
          "author_name": "Sam",
          "position": 0,
          "created_at": 1730000010000,
          "comments": [
            {
              "id": "cm1",
              "card_id": "card1",
              "content": "Agreed!",
              "author_name": "Priya",
              "created_at": 1730000020000
            }
          ]
        }
      ]
    }
  ]
}
```

**404** — `board not found`.

### `POST /api/boards/:id/columns`
Append a new column to the board. Position is auto-assigned as `MAX(position) + 1`.

**Body**
```json
{ "title": "Kudos" }
```

- `title`: required, 1–60 chars.

**201** — the column.

**404** — `board not found`.

### `GET /api/boards/:id/export`
Streams the entire board (columns → cards → comments) as CSV. Columns:

```
board_title, column, card_content, card_author, card_created_at, comment_content, comment_author, comment_created_at
```

- One row per (card, comment) pair; cards with no comments emit a single row with empty comment fields; empty columns emit a placeholder row.
- Timestamps are ISO-8601 UTC.
- Response headers: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="<safe-title>.csv"`.

**404** — `board not found`.

---

## Socket.io events

Connect to the server's Socket.io endpoint (default namespace, path `/socket.io`). After connecting, each client MUST `join_board` before other events are honored — the server scopes every broadcast to `board:<boardId>` rooms.

### Client → Server

#### `join_board`
```json
{ "boardId": "abc123", "displayName": "Sam" }
```
Joins the board's room and stashes `displayName` on the socket for author defaults.

#### `add_card`
```json
{
  "boardId": "abc123",
  "columnId": "col1",
  "content": "Deploys were smooth.",
  "authorName": "Sam"
}
```
- Server verifies `columnId` belongs to `boardId`.
- Content is trimmed and capped at 500 chars.
- Position is auto-assigned as the current column length.

#### `move_card`
```json
{
  "boardId": "abc123",
  "cardId": "card1",
  "toColumnId": "col2",
  "newPosition": 0
}
```
- Server verifies the destination column belongs to `boardId`.
- Positions in the source and destination columns are reflowed atomically inside a SQLite transaction.

#### `add_comment`
```json
{
  "boardId": "abc123",
  "cardId": "card1",
  "content": "Agreed!",
  "authorName": "Priya"
}
```
- Server verifies the card's column belongs to `boardId`.
- Content trimmed and capped at 500 chars.

### Server → Client

Broadcasts land in every socket joined to `board:<boardId>`, including the originator (idempotent merge on the client keeps this safe).

#### `joined_board`
```json
{ "boardId": "abc123" }
```
Ack for a successful `join_board`.

#### `card_added`
```json
{ "card": { /* full Card row */ } }
```

#### `card_moved`
```json
{ "cardId": "card1", "toColumnId": "col2", "newPosition": 0 }
```

#### `comment_added`
```json
{ "comment": { /* full Comment row */ } }
```

---

## Data model

```
boards          (id, title, created_at)
board_columns   (id, board_id → boards, title, position, created_at)
cards           (id, column_id → board_columns, content, author_name, position, created_at)
comments        (id, card_id → cards, content, author_name, created_at)
```

All foreign keys cascade on delete. Positions are integers reflowed on every move. Timestamps are `Date.now()` milliseconds.

## Validation & limits

| Field                | Limit           |
|----------------------|-----------------|
| board title          | 1–120 chars     |
| column title         | 1–60 chars      |
| card content         | 1–500 chars     |
| comment content      | 1–500 chars     |
| author display name  | 1–40 chars      |

Malformed payloads over Socket.io are silently ignored — no error broadcast — because the server treats invalid events as noise from a stale/malicious client. Clients should validate before sending.
