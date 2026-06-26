# API Reference

The server exposes a small REST API for non-realtime operations (creating
boards, listing boards, fetching full board state, adding columns, exporting
CSV) and a Socket.io channel for everything that needs to fan out to other
clients (cards, moves, comments).

## Conventions

- All payloads are JSON unless otherwise noted.
- Timestamps are returned as ISO-8601 strings (UTC, without trailing `Z`).
  Clients should treat them as UTC.
- IDs are UUIDs (v4) generated server-side.

## REST endpoints

### `GET /api/health`

Liveness probe. Returns `{ "ok": true }`.

### `GET /api/boards`

List all boards, newest first.

```json
[
  { "id": "uuid", "title": "Sprint 42", "created_at": "2026-06-25 14:00:00" }
]
```

### `POST /api/boards`

Create a new board. Body:

```json
{ "title": "Sprint 42", "columns": ["Went Well", "Needs Improvement"] }
```

`columns` is optional; when omitted, the board is initialized with the
defaults `["Went Well", "Needs Improvement", "Action Items"]`. Returns the
full board (same shape as `GET /api/boards/:id`) with status `201`.

### `GET /api/boards/:id`

Fetch a single board, including all columns, cards, and comments.

```json
{
  "id": "uuid",
  "title": "Sprint 42",
  "created_at": "2026-06-25 14:00:00",
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
          "content": "Pairing was great",
          "author_name": "Alex",
          "position": 0,
          "created_at": "...",
          "comments": [
            {
              "id": "uuid",
              "card_id": "uuid",
              "content": "+1",
              "author_name": "Sam",
              "created_at": "..."
            }
          ]
        }
      ]
    }
  ]
}
```

Returns `404` if the board doesn't exist.

### `POST /api/boards/:id/columns`

Append a new column. Body `{ "title": "Action Items" }`. The new column is
also broadcast over Socket.io as `column_added` to everyone in the board
room.

### `GET /api/boards/:id/export`

Stream the board's contents as CSV. Sets
`Content-Disposition: attachment; filename="<board-title>.csv"`. Columns:

```
board_title, column, card_position, card_author, card_created_at,
card_content, comment_author, comment_created_at, comment_content
```

Cards with no comments emit one row (comment columns blank). Cards with N
comments emit N rows, one per comment. Empty columns emit a single
placeholder row.

## Socket.io channel

The client connects to the same origin as the REST API.

### Client → Server events

| Event         | Payload                                                  | Description                                  |
|---------------|----------------------------------------------------------|----------------------------------------------|
| `join_board`  | `{ boardId, name }`                                      | Required first call. Joins room `board:<id>` and replies with the full board snapshot. |
| `add_card`    | `{ columnId, content }`                                  | Append a card. Broadcasts `card_added`.      |
| `move_card`   | `{ cardId, toColumnId, toPosition }`                     | Move a card. Broadcasts `card_moved`.        |
| `add_comment` | `{ cardId, content }`                                    | Append a comment. Broadcasts `comment_added`.|

Every event accepts an acknowledgement callback:
`socket.emit('add_card', payload, (res) => { ... })`. The reply is shaped
`{ ok: true, ... }` or `{ ok: false, error: '...' }`.

### Server → Client events

| Event            | Payload                                                                            |
|------------------|------------------------------------------------------------------------------------|
| `card_added`     | Full card object (including empty `comments` array)                                |
| `card_moved`     | `{ cardId, fromColumnId, toColumnId, toPosition }`                                 |
| `comment_added`  | Full comment object                                                                |
| `column_added`   | Full column object (including empty `cards` array)                                 |
| `presence_joined`/`presence_left` | `{ name }` — informational, not used by the default UI            |

### Source of truth & reconnection

The server is the source of truth. The client must:

1. Fetch the board over REST (or wait for the `join_board` ack) for the
   initial snapshot.
2. Apply broadcasts to the local state idempotently — every state update is
   represented as a pure reducer (`applyCardAdded`, `applyCardMoved`,
   `applyCommentAdded`, `applyColumnAdded`) and ignores duplicates.
3. On reconnect, `join_board` is re-emitted automatically, and the server's
   snapshot in the ack replaces the local state.
