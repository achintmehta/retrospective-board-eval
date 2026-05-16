# API Documentation

Base URL: `http://localhost:3001/api`

## Boards

### `GET /boards`

Returns a list of all boards sorted by creation date (newest first).

**Response** `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Sprint 12 Retro",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
]
```

---

### `POST /boards`

Creates a new board with optional custom columns.

**Request Body**
```json
{
  "title": "Sprint 12 Retro",
  "columns": ["Went Well", "Needs Improvement", "Action Items"]
}
```

- `title` (string, required): The board name
- `columns` (string[], optional): Column titles. Defaults to `["Went Well", "Needs Improvement", "Action Items"]`

**Response** `201 Created` — Full board object with columns

```json
{
  "id": "uuid",
  "title": "Sprint 12 Retro",
  "created_at": "2024-01-15T10:30:00.000Z",
  "columns": [
    {
      "id": "uuid",
      "board_id": "uuid",
      "title": "Went Well",
      "position": 0,
      "cards": []
    }
  ]
}
```

---

### `GET /boards/:id`

Fetches a specific board with all its columns, cards, and comments.

**Response** `200 OK`

```json
{
  "id": "uuid",
  "title": "Sprint 12 Retro",
  "created_at": "2024-01-15T10:30:00.000Z",
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
          "content": "Team collaboration was great!",
          "author_name": "Alice",
          "created_at": "2024-01-15T10:35:00.000Z",
          "position": 0,
          "comments": [
            {
              "id": "uuid",
              "card_id": "uuid",
              "content": "Agreed!",
              "author_name": "Bob",
              "created_at": "2024-01-15T10:40:00.000Z"
            }
          ]
        }
      ]
    }
  ]
}
```

**Response** `404 Not Found` if board doesn't exist.

---

### `POST /boards/:id/columns`

Adds a new column to a board.

**Request Body**
```json
{
  "title": "Shoutouts"
}
```

**Response** `201 Created`
```json
{
  "id": "uuid",
  "board_id": "uuid",
  "title": "Shoutouts",
  "position": 3
}
```

---

### `GET /boards/:id/export`

Exports the full board data as a CSV file download.

**Response** `200 OK` — CSV file with headers:

```
board_title,column_title,card_content,card_author,card_created_at,comment_content,comment_author,comment_created_at
```

Each card without comments gets one row with empty comment fields. Cards with comments get one row per comment.

---

## WebSocket Events (Socket.io)

Connect to the server at `ws://localhost:3001` (or via the `/socket.io` path).

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join_board` | `boardId: string` | Join a board's room to receive real-time updates |
| `leave_board` | `boardId: string` | Leave a board's room |
| `add_card` | `{ boardId, columnId, content, authorName }` | Add a card to a column |
| `move_card` | `{ boardId, cardId, newColumnId, newPosition }` | Move a card to a different column/position |
| `add_comment` | `{ boardId, cardId, content, authorName }` | Add a comment to a card |
| `add_column` | `{ boardId, column }` | Broadcast a newly added column |

### Server → Client (broadcast to board room)

| Event | Payload | Description |
|-------|---------|-------------|
| `card_added` | `Card` object | A new card was added |
| `card_moved` | `{ cardId, newColumnId, newPosition }` | A card was moved |
| `comment_added` | `Comment` object | A new comment was added |
| `column_added` | `BoardColumn` object | A new column was added |
| `error` | `{ message: string }` | An error occurred processing your event |

## Data Models

### Board
```typescript
interface Board {
  id: string;          // UUID
  title: string;
  created_at: string;  // ISO 8601
}
```

### BoardColumn
```typescript
interface BoardColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;  // 0-indexed ordering
}
```

### Card
```typescript
interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: string;
  position: number;
}
```

### Comment
```typescript
interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}
```
