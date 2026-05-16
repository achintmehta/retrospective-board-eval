# Frontend Documentation

## Tech Stack

- **React** (via Vite) for UI
- **React Router** for client-side navigation
- **Socket.io Client** for real-time WebSocket communication
- **@hello-pangea/dnd** for drag-and-drop functionality

## Pages

### Main Page (`/`)
- Displays all existing retrospective boards
- Provides a form to create a new board
- Navigates to the board page on creation

### Board Page (`/board/:id`)
- Prompts for a display name on first visit (guest auth)
- Displays columns with cards in a horizontal layout
- Supports drag-and-drop of cards between columns
- Provides forms to add new cards to each column
- Provides a form to add new columns
- Clicking a card opens a modal to view/add comments
- "Export to CSV" button downloads board data

## Real-Time Integration

The Board Page connects to Socket.io on mount (after guest auth). It:

1. Joins the board's room via `join_board`
2. Listens for `card_added`, `card_moved`, `comment_added`, and `column_added` events
3. Updates local state on receiving events for instant UI updates
4. Emits events when the user adds cards, moves cards, adds comments, or creates columns

## State Management

State is managed locally with React's `useState`. The server is the source of truth - clients receive broadcast events and update their local view accordingly. On reconnect, the page re-fetches the full board state.

## Development

```bash
cd client
npm install
npm run dev
```

The Vite dev server runs on port 5173 and proxies `/api` and `/socket.io` requests to the backend on port 3000.
