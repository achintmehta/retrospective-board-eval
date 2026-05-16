# Realtime Retro Board API

## Endpoints

### GET /api/boards

Fetch all boards.

**Response:**
```json
[
  {
    "id": "board_id",
    "title": "Board Title",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /api/boards

Create a new board.

**Request Body:**
```json
{
  "title": "New Board Title"
}
```

**Response (201):**
```json
{
  "id": "board_id",
  "title": "New Board Title",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### GET /api/boards/:id

Fetch a specific board with its columns, cards, and comments.

**Response:**
```json
{
  "id": "board_id",
  "title": "Board Title",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "columns": [
    {
      "id": "column_id",
      "boardId": "board_id",
      "title": "Column Title",
      "position": 0,
      "cards": [
        {
          "id": "card_id",
          "columnId": "column_id",
          "content": "Card Content",
          "authorName": "Anonymous",
          "createdAt": "2024-01-01T00:00:00.000Z",
          "position": 0
        }
      ]
    }
  ]
}
```

### POST /api/boards/:id/columns

Create a new column for a board.

**Request Body:**
```json
{
  "title": "New Column Title"
}
```

**Response (201):**
```json
{
  "id": "column_id",
  "boardId": "board_id",
  "title": "New Column Title",
  "position": 1
}
```

### GET /api/boards/:id/export

Export a board to CSV format.

**Response:**
CSV file with columns: `Column,Card Content,Author,Created At`
