# Frontend Documentation

The frontend is a React single-page application built with Vite.

## Pages

### HomePage (`/`)
- Displays all existing boards sorted by creation date
- Provides a form to create a new board
- Clicking a board navigates to its detail page

### BoardPage (`/board/:id`)
- Requires guest authentication (display name entry via modal)
- Displays board columns with cards
- Supports drag-and-drop card movement between columns
- Real-time updates via Socket.io

## Components

### GuestAuthModal
Prompts the user for a display name before they can interact with a board. The name is stored in `sessionStorage` for the duration of the browser session.

### Column
Renders a board column with its cards. Includes a droppable zone for drag-and-drop and a form to add new cards.

### Card
Displays card content, author name, and a comment count/button that opens the comments modal.

### CommentsModal
Shows all comments for a card and provides a form to add new comments. Comments are sent via Socket.io and appear in real-time for all connected clients.

## Real-Time Integration

The board page connects to Socket.io on mount (after guest auth). It:
1. Joins the board's room via `join_board`
2. Listens for `card_added`, `card_moved`, and `comment_added` events
3. Emits events when the user adds cards, moves cards, or adds comments

## Drag and Drop

Uses `@hello-pangea/dnd` for card reordering. When a card is dropped in a new column, a `move_card` event is emitted to the server, which broadcasts the update to all clients.

## Development

```bash
cd client
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/socket.io` requests to the backend at `localhost:3001`.
