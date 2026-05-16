# API Documentation

## REST Endpoints

### `GET /api/boards`
Fetches a list of all boards.

### `POST /api/boards`
Creates a new board.
- **Body**: `{ "title": "My Board" }`

### `GET /api/boards/:id`
Fetches the full state of a board, including columns, cards, and comments.

### `POST /api/boards/:id/columns`
Creates a new column in a board.
- **Body**: `{ "title": "Went Well", "position": 0 }`

### `GET /api/boards/:id/export`
Exports the board's cards and comments as a CSV file.

## WebSockets

Connecting: `const socket = io();`

### Events Emitted by Client
- `join_board(boardId)`: Join a board's room.
- `add_card({ boardId, columnId, content, authorName, position })`: Add a card.
- `move_card({ boardId, cardId, newColumnId, newPosition })`: Move a card.
- `add_comment({ boardId, cardId, content, authorName })`: Add a comment to a card.

### Events Received by Client
- `card_added(card)`: A new card was added.
- `card_moved({ cardId, newColumnId, newPosition })`: A card was moved.
- `comment_added(comment)`: A new comment was added.
