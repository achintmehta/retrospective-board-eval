# Frontend Documentation

The frontend is a React single-page application built with Vite, located in the `client/` directory.

## Structure

```
client/src/
  main.jsx              # Entry point, sets up BrowserRouter
  App.jsx               # Route definitions
  index.css             # Global styles
  pages/
    HomePage.jsx        # Board listing and creation
    BoardPage.jsx       # Board view with real-time collaboration
  components/
    GuestAuthModal.jsx  # Display name prompt
    Column.jsx          # Board column with droppable zone
    CardItem.jsx        # Draggable card with comment toggle
    AddCardForm.jsx     # Inline form to add cards
    CommentSection.jsx  # Comment list and input for a card
```

## Pages

### HomePage (`/`)

Displays all boards sorted by creation date. Includes a form to create a new board. Clicking a board navigates to its detail page.

### BoardPage (`/board/:id`)

The main collaborative view. On first visit, shows a GuestAuthModal to collect the user's display name (stored in `sessionStorage`). Once authenticated:

- Connects to Socket.io and joins the board's room
- Fetches full board data (columns, cards, comments) via REST
- Listens for real-time events (`card_added`, `card_moved`, `comment_added`)
- Renders columns with drag-and-drop support via `@hello-pangea/dnd`
- Provides forms to add columns, add cards, and add comments
- Includes an "Export CSV" download link

## Key Libraries

- **react-router-dom** — Client-side routing
- **socket.io-client** — WebSocket connection to the backend
- **@hello-pangea/dnd** — Drag-and-drop for moving cards between columns

## Development

```bash
cd client
npm run dev
```

The Vite dev server proxies `/api` and `/socket.io` requests to the backend at `http://localhost:3000`.
