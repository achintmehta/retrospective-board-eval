# API Reference

Two surfaces: a small REST API for board CRUD/export and a Socket.io channel for realtime collaboration.

Base URL: `/api` for REST. Socket.io is mounted at the default `/socket.io` path on the same origin.

## REST

All responses are JSON unless noted. Errors look like `{ "error": "message" }` with the appropriate status code.

### `GET /api/boards`

List all boards, newest first.

```json
[
  { "id": "kzx8...", "title": "Sprint 42 Retro", "created_at": 1717900000000 }
]
```

### `POST /api/boards`

Create a board. A new board is seeded with three default columns: *Went Well*, *Needs Improvement*, *Action Items*.

Request body:
```json
{ "title": "Sprint 42 Retro" }
```

Returns the full board (same shape as `GET /api/boards/:id`).

### `GET /api/boards/:id`

Fetch one board with its columns, cards, and comments.

```json
{
  "id": "kzx8...",
  "title": "Sprint 42 Retro",
  "created_at": 1717900000000,
  "columns": [
    {
      "id": "col-1",
      "board_id": "kzx8...",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "card-1",
          "column_id": "col-1",
          "content": "Shipped on time",
          "author_name": "Alex",
          "created_at": 1717900050000,
          "position": 0,
          "comments": [
            {
              "id": "cmt-1",
              "card_id": "card-1",
              "content": "+1",
              "author_name": "Sam",
              "created_at": 1717900060000
            }
          ]
        }
      ]
    }
  ]
}
```

404 if the board does not exist.

### `POST /api/boards/:id/columns`

Add a new column to a board. The column is appended at the end.

Request body:
```json
{ "title": "Action Items" }
```

Response: the new column object. Note: REST column creation does **not** broadcast over the socket on its own — the client triggering it patches its own state, and other connected clients see the column after their next reload/refetch. (Practical for the team-retro use case; if you need realtime column creation, emit a custom socket event from the route handler.)

### `GET /api/boards/:id/export`

Stream the board as a CSV file. The response has `Content-Type: text/csv` and a `Content-Disposition` attachment header.

CSV columns: `board_id, board_title, column_id, column_title, row_type, item_id, parent_card_id, author_name, created_at, content`.

`row_type` is either `card` or `comment`. For comments, `parent_card_id` is set; for cards it is empty.

## Socket.io

Connect to the same origin as the API. The client emits events with an optional acknowledgement callback; the server replies with `{ ok: true }` or `{ ok: false, error: "..." }`.

### Client → Server events

| Event         | Payload                                                  | Notes                                  |
|---------------|----------------------------------------------------------|----------------------------------------|
| `join_board`  | `boardId: string`                                        | Joins room `board:<id>`                |
| `leave_board` | `boardId: string`                                        | Leaves the room                        |
| `add_card`    | `{ columnId, content, authorName }`                      | Server saves + broadcasts `card_added` |
| `move_card`   | `{ cardId, toColumnId, toIndex }`                        | Reorders within a column or moves across columns; broadcasts `card_moved` |
| `add_comment` | `{ cardId, content, authorName }`                        | Broadcasts `comment_added`             |

### Server → Client events

All include `board_id` so the client can filter.

| Event           | Payload                                                                              |
|-----------------|--------------------------------------------------------------------------------------|
| `card_added`    | `{ board_id, column_id, card }`                                                      |
| `card_moved`    | `{ board_id, card_id, from_column_id, to_column_id, to_index }`                      |
| `comment_added` | `{ board_id, card_id, comment }`                                                     |

### Validation

- `add_card` / `add_comment`: trims content, falls back to `"Anonymous"` for an empty author name, and rejects if content is empty.
- `move_card`: clamps `toIndex` into a valid range. Cross-column moves repack `position` on both source and target columns inside a single transaction.

## Authentication

Guest auth only — clients pick a display name on first visit to a board. It is stored in `sessionStorage` (per-tab) and attached to every `add_card`/`add_comment` payload. There is no server-side session.
