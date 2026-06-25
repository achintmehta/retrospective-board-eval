# API Documentation

Base URL: `http://localhost:3001`

## REST Endpoints

### Boards

#### `GET /api/boards`
Returns all boards sorted by creation date (newest first).

**Response** `200 OK`
```json
[
  { "id": "uuid", "title": "Sprint 42 Retro", "created_at": "2024-01-15 10:00:00" }
]
```

#### `POST /api/boards`
Create a new board.

**Request body**
```json
{ "title": "Sprint 42 Retro" }
```

**Response** `201 Created`
```json
{ "id": "uuid", "title": "Sprint 42 Retro", "created_at": "2024-01-15 10:00:00" }
```

#### `GET /api/boards/:id`
Fetch a board with all nested columns, cards, and comments.

**Response** `200 OK`
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
          "content": "Great team collaboration",
          "author_name": "Alice",
          "created_at": "...",
          "position": 0,
          "comments": [
            { "id": "uuid", "card_id": "uuid", "content": "+1", "author_name": "Bob", "created_at": "..." }
          ]
        }
      ]
    }
  ]
}
```

**Error** `404 Not Found` if board does not exist.

#### `POST /api/boards/:id/columns`
Add a column to a board.

**Request body**
```json
{ "title": "Needs Improvement" }
```

**Response** `201 Created`
```json
{ "id": "uuid", "board_id": "uuid", "title": "Needs Improvement", "position": 1 }
```

Also broadcasts `column_added` to all Socket.io clients in the board room.

#### `GET /api/boards/:id/export`
Export all board data as a CSV file download.

**Response**: `text/csv` attachment with columns:
`Board, Column, Card Content, Card Author, Card Created At, Comment, Comment Author, Comment Created At`

---

## WebSocket Events (Socket.io)

Connect to the same server. The client joins a board-specific room.

### Client → Server

#### `join_board`
Join a board room to receive real-time updates.
```js
socket.emit('join_board', { boardId: 'uuid' })
```

#### `leave_board`
Leave a board room.
```js
socket.emit('leave_board', { boardId: 'uuid' })
```

#### `add_card`
Add a card to a column.
```js
socket.emit('add_card', { boardId, columnId, content, authorName }, (ack) => {
  // ack: { success: true, card: {...} } | { success: false, error: '...' }
})
```

#### `move_card`
Move a card to a different column or position.
```js
socket.emit('move_card', { boardId, cardId, newColumnId, newPosition }, (ack) => {})
```

#### `add_comment`
Add a comment to a card.
```js
socket.emit('add_comment', { boardId, cardId, content, authorName }, (ack) => {})
```

### Server → Client (broadcasts to board room)

| Event | Payload | Description |
|---|---|---|
| `card_added` | Card object | Emitted after a card is saved |
| `card_moved` | Updated card object | Emitted after a card's column/position changes |
| `comment_added` | Comment object | Emitted after a comment is saved |
| `column_added` | Column object | Emitted after a column is created via REST |
