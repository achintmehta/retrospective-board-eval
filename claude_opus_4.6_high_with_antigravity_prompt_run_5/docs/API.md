# API Documentation

Base URL: `http://localhost:3000`

## REST Endpoints

### Boards

#### `POST /api/boards`
Create a new board.

**Request body:**
```json
{ "title": "Sprint 42 Retro" }
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "title": "Sprint 42 Retro",
  "created_at": "2024-01-15 10:30:00",
  "columns": []
}
```

#### `GET /api/boards`
List all boards, sorted by creation date (newest first).

**Response:** `200 OK`
```json
[
  { "id": 1, "title": "Sprint 42 Retro", "created_at": "2024-01-15 10:30:00" }
]
```

#### `GET /api/boards/:id`
Get a board with all columns, cards, and comments.

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "Sprint 42 Retro",
  "created_at": "2024-01-15 10:30:00",
  "columns": [
    {
      "id": 1,
      "board_id": 1,
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": 1,
          "column_id": 1,
          "content": "Great teamwork!",
          "author_name": "Alice",
          "position": 0,
          "created_at": "2024-01-15 10:35:00",
          "comments": [
            {
              "id": 1,
              "card_id": 1,
              "content": "Agreed!",
              "author_name": "Bob",
              "created_at": "2024-01-15 10:36:00"
            }
          ]
        }
      ]
    }
  ]
}
```

### Columns

#### `POST /api/boards/:id/columns`
Add a column to a board.

**Request body:**
```json
{ "title": "Action Items" }
```

**Response:** `201 Created`
```json
{ "id": 3, "board_id": 1, "title": "Action Items", "position": 2, "cards": [] }
```

### Export

#### `GET /api/boards/:id/export`
Download board data as CSV.

**Response:** `200 OK` (Content-Type: text/csv)

## WebSocket Events

Connect via Socket.io to the server root URL.

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_board` | `{ boardId, displayName }` | Join a board room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card |
| `move_card` | `{ cardId, fromColumnId, toColumnId, newPosition }` | Move a card |
| `add_comment` | `{ cardId, content, authorName }` | Add a comment |
| `add_column` | `{ boardId, column }` | Broadcast new column |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `card_added` | Card object | A card was added |
| `card_moved` | `{ cardId, fromColumnId, toColumnId, newPosition }` | A card was moved |
| `comment_added` | Comment object | A comment was added |
| `column_added` | Column object | A column was added |
