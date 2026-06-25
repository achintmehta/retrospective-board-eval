# API Documentation

Base URL: `/api`

## Boards

### Create Board
`POST /api/boards`

**Body:** `{ "title": "Sprint 42 Retro" }`

**Response (201):**
```json
{ "id": 1, "title": "Sprint 42 Retro", "created_at": "2024-01-15 10:30:00" }
```

### List Boards
`GET /api/boards`

**Response (200):** Array of boards sorted by creation date (newest first).

### Get Board Details
`GET /api/boards/:id`

**Response (200):** Board object with nested columns, cards, and comments.

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
          "content": "Great teamwork",
          "author_name": "Alice",
          "created_at": "2024-01-15 10:35:00",
          "position": 0,
          "comments": [
            {
              "id": 1,
              "card_id": 1,
              "content": "Agreed!",
              "author_name": "Bob",
              "created_at": "2024-01-15 10:40:00"
            }
          ]
        }
      ]
    }
  ]
}
```

### Create Column
`POST /api/boards/:id/columns`

**Body:** `{ "title": "Went Well" }`

**Response (201):** The created column object.

### Export Board to CSV
`GET /api/boards/:id/export`

**Response:** CSV file download with columns: Column, Card Content, Card Author, Card Created At, Comment, Comment Author, Comment Created At.

## WebSocket Events

Connect via Socket.io to the server.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` (number) | Join a board room for real-time updates |
| `add_card` | `{ columnId, content, authorName }` | Add a card to a column |
| `move_card` | `{ cardId, newColumnId, newPosition }` | Move a card to a different column/position |
| `add_comment` | `{ cardId, content, authorName }` | Add a comment to a card |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object | A card was added |
| `card_moved` | `{ cardId, newColumnId, newPosition }` | A card was moved |
| `comment_added` | Comment object with `cardId` | A comment was added |
