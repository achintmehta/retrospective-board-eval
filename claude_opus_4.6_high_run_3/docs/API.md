# API Documentation

Base URL: `http://localhost:3001/api`

## Boards

### Create Board

```
POST /boards
```

**Body:**
```json
{ "title": "Sprint 42 Retro" }
```

**Response:** `201 Created`
```json
{ "id": 1, "title": "Sprint 42 Retro" }
```

### List Boards

```
GET /boards
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "Sprint 42 Retro",
    "created_at": "2024-01-15 10:30:00"
  }
]
```

### Get Board

```
GET /boards/:id
```

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
          "content": "Great teamwork",
          "author_name": "Alice",
          "position": 0,
          "created_at": "2024-01-15 10:35:00",
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

### Add Column

```
POST /boards/:id/columns
```

**Body:**
```json
{ "title": "Went Well" }
```

**Response:** `201 Created`
```json
{ "id": 1, "board_id": 1, "title": "Went Well", "position": 0 }
```

### Export Board to CSV

```
GET /boards/:id/export
```

**Response:** `200 OK` with `Content-Type: text/csv`

Downloads a CSV file containing all columns, cards, and comments.

## WebSocket Events

Connect via Socket.io to `http://localhost:3001`.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` (number) | Join a board's real-time room |
| `leave_board` | `boardId` (number) | Leave a board's room |
| `add_card` | `{ columnId, content, authorName, boardId }` | Add a card to a column |
| `move_card` | `{ cardId, targetColumnId, targetPosition, boardId }` | Move a card |
| `add_comment` | `{ cardId, content, authorName, boardId }` | Add a comment to a card |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | Card object | A new card was added |
| `card_moved` | `{ cardId, targetColumnId, targetPosition }` | A card was moved |
| `comment_added` | Comment object with `cardId` | A new comment was added |
