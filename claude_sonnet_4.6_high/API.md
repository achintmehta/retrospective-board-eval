# API Documentation

Base URL: `http://localhost:3000/api`

## Boards

### Create a Board
`POST /boards`

**Body:** `{ "title": "Sprint 42 Retro" }`

**Response 201:**
```json
{ "id": "uuid", "title": "Sprint 42 Retro", "created_at": "2024-01-01T00:00:00" }
```

### List All Boards
`GET /boards`

**Response 200:** Array of board objects sorted by `created_at` descending.

### Get a Board (with columns, cards, comments)
`GET /boards/:id`

**Response 200:**
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
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
          "content": "Great teamwork",
          "author_name": "Alice",
          "created_at": "...",
          "position": 0,
          "comments": [
            { "id": "uuid", "card_id": "uuid", "content": "Agreed!", "author_name": "Bob", "created_at": "..." }
          ]
        }
      ]
    }
  ]
}
```

**Response 404:** `{ "error": "Board not found" }`

### Create a Column
`POST /boards/:id/columns`

**Body:** `{ "title": "Went Well" }`

**Response 201:**
```json
{ "id": "uuid", "board_id": "uuid", "title": "Went Well", "position": 0 }
```

### Export Board to CSV
`GET /boards/:id/export`

Downloads a CSV file with columns: Column, Card Content, Card Author, Card Created At, Comment Content, Comment Author, Comment Created At.

## Socket.io Events

Connect to the server with `socket.io-client`. All events are scoped to a board room.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId: string` | Join the board's socket room |
| `leave_board` | `boardId: string` | Leave the board's socket room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card to a column |
| `move_card` | `{ boardId, cardId, newColumnId, newPosition }` | Move a card to a new column/position |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment to a card |

### Server → Client (broadcast to board room)

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ card, columnId }` | A new card was added |
| `card_moved` | `{ card, newColumnId, newPosition }` | A card was moved |
| `comment_added` | `{ comment, cardId }` | A new comment was added |
| `error` | `{ message }` | An error occurred |
