# Frontend Documentation

## Architecture

The frontend is a React 19 SPA built with Vite. It uses client-side routing (react-router-dom) and real-time updates via socket.io-client.

## Pages

### HomePage (`/`)
- Displays all boards sorted by creation date
- "Create Board" form at the top
- Clicking a board navigates to `/board/:id`

### BoardPage (`/board/:id`)
- Fetches board data (columns, cards, comments) on mount
- Connects to Socket.io and joins the board room
- Features:
  - **Guest Auth Modal**: prompts for display name on first visit (stored in sessionStorage)
  - **Columns**: rendered horizontally with scroll
  - **Cards**: displayed within columns, support drag-and-drop via @hello-pangea/dnd
  - **Add Card**: inline textarea within each column footer
  - **Add Column**: dashed card at the end of the column list
  - **Comments**: modal overlay showing card comments with add-comment input
  - **Export CSV**: button in header, opens download in new tab

## Components

| Component | Purpose |
|-----------|---------|
| `GuestAuthModal` | Prompts for display name before board interaction |
| `CommentModal` | Shows and adds comments for a selected card |

## Real-Time Updates

All mutations (add card, move card, add comment, add column) are sent as Socket.io events. The server writes to SQLite and broadcasts the result to the room. The client updates local state on receiving these broadcasts, keeping all clients in sync.

## Styling

- Dark theme with glassmorphism (backdrop-filter blur, semi-transparent backgrounds)
- CSS custom properties for consistent theming
- Inter font from Google Fonts
- Micro-animations (fadeIn, slideUp, scaleIn) for UI transitions
- Responsive scrollable column layout
