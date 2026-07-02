# API Documentation

Base URL: `http://localhost:3001/api`

## Boards

### Create Board

```
POST /api/boards
Content-Type: application/json

{ "title": "Sprint 42 Retro" }
```

**Response (201):**
```json
{ "id": "uuid", "title": "Sprint 42 Retro" }
```

### List Boards

```
GET /api/boards
```

**Response (200):**
```json
[{ "id": "uuid", "title": "Sprint 42 Retro", "created_at": "2026-07-01 12:00:00" }]
```

### Get Board (with columns, cards, comments)

```
GET /api/boards/:id
```

**Response (200):**
```json
{
  "id": "uuid",
  "title": "Sprint 42 Retro",
  "created_at": "2026-07-01 12:00:00",
  "columns": [
    {
      "id": "col-uuid",
      "title": "Went Well",
      "position": 0,
      "cards": [
        {
          "id": "card-uuid",
          "column_id": "col-uuid",
          "content": "Great teamwork",
          "author_name": "Alice",
          "created_at": "2026-07-01 12:05:00",
          "position": 0,
          "comments": [
            {
              "id": "cmt-uuid",
              "content": "Agreed!",
              "author_name": "Bob",
              "created_at": "2026-07-01 12:10:00"
            }
          ]
        }
      ]
    }
  ]
}
```

### Create Column

```
POST /api/boards/:id/columns
Content-Type: application/json

{ "title": "Went Well" }
```

**Response (201):**
```json
{ "id": "col-uuid", "board_id": "uuid", "title": "Went Well", "position": 0, "cards": [] }
```

### Export Board to CSV

```
GET /api/boards/:id/export
```

**Response:** Downloads a CSV file with columns: Column, Card, Author, Created At, Comment, Comment Author, Comment Date.

## WebSocket Events

Connect via Socket.io to the server.

### Client → Server

| Event         | Payload                                               |
| ------------- | ----------------------------------------------------- |
| `join_board`  | `boardId` (string)                                    |
| `add_card`    | `{ boardId, columnId, content, authorName }`          |
| `move_card`   | `{ boardId, cardId, newColumnId, newPosition }`       |
| `add_comment` | `{ boardId, cardId, content, authorName }`            |

### Server → Client

| Event           | Payload                                     |
| --------------- | ------------------------------------------- |
| `card_added`    | Full card object with empty comments array  |
| `card_moved`    | `{ cardId, newColumnId, newPosition }`      |
| `comment_added` | Full comment object                         |
| `column_added`  | Full column object with empty cards array   |
