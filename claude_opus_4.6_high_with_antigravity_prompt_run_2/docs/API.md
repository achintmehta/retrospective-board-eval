# API Documentation

Base URL: `http://localhost:3001`

## REST Endpoints

### Boards

#### Create Board
`POST /api/boards`

Request body:
```json
{ "title": "Sprint 1 Retro" }
```

Response `201`:
```json
{
  "id": "uuid",
  "title": "Sprint 1 Retro",
  "created_at": "2024-01-01 12:00:00"
}
```

#### List Boards
`GET /api/boards`

Response `200`: Array of board objects sorted by creation date (newest first).

#### Get Board
`GET /api/boards/:id`

Response `200`: Board object with nested columns, cards, and comments.

```json
{
  "id": "uuid",
  "title": "Sprint 1 Retro",
  "created_at": "2024-01-01 12:00:00",
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
          "created_at": "2024-01-01 12:05:00",
          "position": 0,
          "comments": []
        }
      ]
    }
  ]
}
```

#### Create Column
`POST /api/boards/:id/columns`

Request body:
```json
{ "title": "Went Well" }
```

Response `201`: The created column object.

#### Export Board to CSV
`GET /api/boards/:id/export`

Response: CSV file download with columns: Column, Card Content, Card Author, Card Created, Comment, Comment Author, Comment Created.

## WebSocket Events

Connect to `http://localhost:3001` via Socket.io.

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId: string` | Join a board room |
| `leave_board` | `boardId: string` | Leave a board room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card to a column |
| `move_card` | `{ boardId, cardId, sourceColumnId, targetColumnId, targetPosition }` | Move a card |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment to a card |
| `add_column` | `{ boardId, title }` | Add a column to the board |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `{ columnId, card }` | A card was added |
| `card_moved` | `{ cardId, sourceColumnId, targetColumnId, targetPosition }` | A card was moved |
| `comment_added` | `{ cardId, comment }` | A comment was added |
| `column_added` | `{ column }` | A column was added |
