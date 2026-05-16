# API Documentation

## REST Endpoints

### `POST /api/boards`
Create a new board.
- Body: `{ "title": "string" }`
- Returns: `{ "id": "string", "title": "string" }`

### `GET /api/boards`
Fetch all boards.
- Returns: `Array<{ id, title, created_at }>`

### `GET /api/boards/:id`
Fetch a specific board with its columns, cards, and comments.
- Returns: `{ id, title, created_at, columns: [...], cards: [...], comments: [...] }`

### `POST /api/boards/:id/columns`
Create a new column for a board.
- Body: `{ "title": "string", "position": number }`
- Returns: `{ "id": "string", "board_id": "string", "title": "string", "position": number }`

### `GET /api/boards/:id/export`
Export the board's cards as a CSV file.

## WebSockets (Socket.io)

### Events Received by Server
- `join_board (boardId)`: Subscribes client to room for `boardId`
- `add_card ({ boardId, columnId, content, authorName, position })`: Creates a card and broadcasts `card_added`
- `move_card ({ boardId, cardId, newColumnId, newPosition })`: Updates card position and broadcasts `card_moved`
- `add_comment ({ boardId, cardId, content, authorName })`: Creates a comment and broadcasts `comment_added`

### Events Emitted by Server
- `card_added (card_object)`
- `card_moved ({ cardId, newColumnId, newPosition })`
- `comment_added (comment_object)`
