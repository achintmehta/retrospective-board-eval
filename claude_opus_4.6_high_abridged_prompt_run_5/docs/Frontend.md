# Frontend Documentation

The frontend is a React single-page application built with Vite.

## Pages

### Home Page (`/`)
- Displays all existing boards sorted by creation date
- Provides a form to create a new board
- Clicking a board navigates to its board page

### Board Page (`/board/:id`)
- Displays the board with all its columns, cards, and real-time updates
- Requires a guest display name (stored in `sessionStorage`)
- Features:
  - **Columns**: Displayed horizontally with color-coded headers
  - **Cards**: Shown within columns, can be dragged between columns using `@dnd-kit`
  - **Add Card**: Textarea at the bottom of each column, submit with Enter or click button
  - **Add Column**: "Add Column" button at the end of the columns list
  - **Comments**: Click the comment button on a card to open a slide-out panel
  - **Export**: "Export CSV" button in the header downloads the board data

## Components

### GuestModal
Full-screen modal that prompts for a display name before allowing board interaction. The name is persisted in `sessionStorage` for the browser session.

### CommentPanel
Slide-out panel on the right side showing comments for a selected card. Supports adding new comments in real-time.

## Real-Time Integration

The board page connects to the server via Socket.io. On connection:
1. Joins the board's room via `join_board`
2. Listens for `card_added`, `card_moved`, `comment_added`, and `column_added` events
3. Updates local state on each event for instant UI updates
4. On reconnection, re-joins the room and refetches the full board state

## Development

```bash
cd client
npm install
npm run dev
```

The Vite dev server runs on port 5173 and proxies `/api` and `/socket.io` requests to the backend on port 3001.
