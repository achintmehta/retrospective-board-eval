# API Documentation

Base URL: `http://localhost:3000/api`

## Boards

### Create Board

```
POST /api/boards
Content-Type: application/json

{ "title": "Sprint 42 Retro" }
```

**Response** `201 Created`
```json
{
  "id": 1,
  "title": "Sprint 42 Retro",
  "created_at": "2025-01-15T10:30:00.000Z",
  "columns": []
}
```

### List Boards

```
GET /api/boards
```

**Response** `200 OK`
```json
[
  { "id": 1, "title": "Sprint 42 Retro", "created_at": "2025-01-15T10:30:00.000Z" }
]
```

### Get Board (Full)

```
GET /api/boards/:id
```

**Response** `200 OK`
```json
{
  "id": 1,
  "title": "Sprint 42 Retro",
  "created_at": "2025-01-15T10:30:00.000Z",
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
          "created_at": "2025-01-15T10:35:00.000Z",
          "comments": [
            {
              "id": 1,
              "card_id": 1,
              "content": "Agreed!",
              "author_name": "Bob",
              "created_at": "2025-01-15T10:40:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

## Columns

### Create Column

```
POST /api/boards/:id/columns
Content-Type: application/json

{ "title": "Went Well" }
```

**Response** `201 Created`
```json
{
  "id": 1,
  "board_id": 1,
  "title": "Went Well",
  "position": 0,
  "cards": []
}
```

## Export

### Export Board to CSV

```
GET /api/boards/:id/export
```

**Response** `200 OK` — Downloads a CSV file with all columns, cards, and comments.

CSV columns: `Column, Card Content, Card Author, Card Created, Comment, Comment Author, Comment Created`

## WebSocket Events

Connection: `socket.io` at the server root.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId` (number) | Join a board's real-time room |
| `leave_board` | `boardId` (number) | Leave a board's room |
| `add_card` | `{ column_id, content, author_name, board_id }` | Add a card to a column |
| `move_card` | `{ card_id, source_column_id, target_column_id, board_id }` | Move a card between columns |
| `add_comment` | `{ card_id, content, author_name, board_id }` | Add a comment to a card |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ column_id, card }` | A card was added |
| `card_moved` | `{ card_id, source_column_id, target_column_id, card }` | A card was moved |
| `comment_added` | `{ card_id, comment }` | A comment was added |
