# API Reference

The server exposes a small REST surface for board CRUD and CSV export, plus a Socket.io interface for real-time board collaboration.

All REST endpoints are rooted at `/api`. JSON request bodies require `Content-Type: application/json`.

## REST

### `GET /api/health`
Liveness probe.

**Response:** `200 OK` `{ "ok": true }`

---

### `POST /api/boards`
Create a new board. The board is initialized with three default columns (`Went Well`, `Needs Improvement`, `Action Items`).

**Request body:**
```json
{ "title": "Sprint 42 Retro" }
```

**Response:** `201 Created` — board with its columns (each with empty `cards` array).

```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "2026-06-26 12:00:00",
  "columns": [
    { "id": "uuid", "board_id": "uuid", "title": "Went Well", "position": 0, "cards": [] },
    ...
  ]
}
```

**Errors:** `400` if `title` is missing or blank.

---

### `GET /api/boards`
List all boards, newest first.

**Response:** `200 OK`
```json
[{ "id": "uuid", "title": "Sprint 42 Retro", "created_at": "..." }, ...]
```

---

### `GET /api/boards/:id`
Fetch a board with its columns, cards, and nested comments.

**Response:** `200 OK` — full board tree. `404` if the board does not exist.

```json
{
  "id": "uuid",
  "title": "...",
  "created_at": "...",
  "columns": [
    {
      "id": "uuid",
      "board_id": "uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "uuid",
          "column_id": "uuid",
          "content": "...",
          "author_name": "Alice",
          "position": 0,
          "created_at": "...",
          "comments": [
            { "id": "uuid", "card_id": "uuid", "content": "...", "author_name": "Bob", "created_at": "..." }
          ]
        }
      ]
    }
  ]
}
```

---

### `POST /api/boards/:id/columns`
Append a new column to a board. The new column is broadcast to everyone in the board's Socket.io room as `column_added`.

**Request body:** `{ "title": "Action Items" }`

**Response:** `201 Created` — the new column. `404` if board not found.

---

### `GET /api/boards/:id/export`
Download the board as CSV. Returns `text/csv; charset=utf-8` with a `Content-Disposition: attachment` header.

CSV columns:
```
board_title,column,card_content,card_author,card_created_at,comment_content,comment_author,comment_created_at
```

Each card produces one row per comment, or one row with empty comment fields if the card has no comments. Empty columns produce a row with only the column name set. `404` if the board is not found.

---

## Socket.io

Clients connect to the same origin as the HTTP server. Each socket joins a per-board room before sending events.

### `join_board` *(client → server)*
Join a board's broadcast room and register the user's display name with the connection.

**Payload:** `{ boardId: string, displayName: string }`

**Ack:** `{ ok: true }` on success, `{ ok: false, error: string }` if the board does not exist.

A client may call `join_board` again to switch boards; it will be removed from the previous room.

### `add_card` *(client → server)*
Add a card to a column. The author is taken from the joined display name.

**Payload:** `{ columnId: string, content: string }`

**Ack:** `{ ok: true, card }` or `{ ok: false, error }`.

**Broadcast (`card_added` to room):** `{ columnId, card }` — `card` includes `id, column_id, content, author_name, position, created_at, comments: []`.

### `move_card` *(client → server)*
Move a card to a new column / position. Positions in the source and destination columns are renumbered transactionally.

**Payload:** `{ cardId: string, toColumnId: string, toPosition: number }`

**Ack:** `{ ok: true }` or `{ ok: false, error }`.

**Broadcast (`card_moved` to room):** `{ cardId, fromColumnId, toColumnId, toPosition }`.

### `add_comment` *(client → server)*
Add a comment to a card. The author is taken from the joined display name.

**Payload:** `{ cardId: string, content: string }`

**Ack:** `{ ok: true, comment }` or `{ ok: false, error }`.

**Broadcast (`comment_added` to room):** `{ cardId, comment }`.

### `column_added` *(server → clients)*
Emitted when a new column is created via the REST endpoint. Clients append it to their local board state.

**Payload:** the column object `{ id, board_id, title, position }`.

---

## Data model

```
boards (id, title, created_at)
board_columns (id, board_id → boards, title, position, created_at)
cards (id, column_id → board_columns, content, author_name, position, created_at)
comments (id, card_id → cards, content, author_name, created_at)
```

Foreign keys cascade on delete. WAL mode is enabled for better concurrent read/write throughput.
