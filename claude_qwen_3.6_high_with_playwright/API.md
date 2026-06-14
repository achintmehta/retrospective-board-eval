# API Documentation

Base URL: `http://localhost:3001/api`

## REST Endpoints

### GET /boards

Returns all boards, sorted by creation date (newest first).

**Response:**
```json
[
  { "id": 1, "title": "Sprint 5 Retro", "created_at": "2026-05-11T10:00:00Z" }
]
```

### POST /boards

Creates a new board.

**Request Body:**
```json
{ "title": "Sprint 6 Retro" }
```

**Response:**
```json
{ "id": 2, "title": "Sprint 6 Retro", "created_at": "2026-05-11T11:00:00Z" }
```

### GET /boards/:id

Returns a board with all columns, cards, and comments.

**Response:**
```json
{
  "id": 1,
  "title": "Sprint 5 Retro",
  "columns": [
    {
      "id": 1,
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": 1,
          "content": "Great communication",
          "author_name": "Alice",
          "comments": [
            { "id": 1, "content": "Agreed!", "author_name": "Bob" }
          ]
        }
      ]
    }
  ]
}
```

### POST /boards/:id/columns

Adds a column to a board.

**Request Body:**
```json
{ "title": "Action Items" }
```

**Response:**
```json
{ "id": 3, "board_id": 1, "title": "Action Items", "position": 2 }
```

### GET /boards/:id/export

Downloads the board data as a CSV file. Columns: board, column, card, card_author, comment, comment_author, created_at.

## Socket.io Events

Connect to `http://localhost:3001`.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `{ boardId }` | Join a board room |
| `add_card` | `{ boardId, columnId, content, authorName, position }` | Add a card |
| `move_card` | `{ boardId, cardId, columnId, position }` | Move a card |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object | New card was added |
| `card_moved` | Card object with updated position | Card was moved |
| `comment_added` | Comment object | New comment was added |
| `error` | `{ message }` | An error occurred |
