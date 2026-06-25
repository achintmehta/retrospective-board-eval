# Frontend Documentation

## Tech Stack

- **React 19** via Vite
- **React Router v7** for client-side routing
- **Socket.io client** for real-time WebSocket communication
- **@hello-pangea/dnd** for drag-and-drop

## Project Structure

```
client/
├── src/
│   ├── main.jsx              # Entry point, BrowserRouter
│   ├── App.jsx               # Route definitions
│   ├── index.css             # Global styles (CSS variables, resets)
│   ├── pages/
│   │   ├── MainPage.jsx      # Board list + create board form
│   │   └── BoardPage.jsx     # Full board view with real-time sync
│   └── components/
│       ├── GuestAuthModal.jsx # Display name prompt
│       ├── Column.jsx         # Droppable column with add-card form
│       └── Card.jsx           # Draggable card with inline comments
├── index.html
└── vite.config.js            # Dev proxy: /api and /socket.io → :3001
```

## Pages

### MainPage (`/`)
- Fetches `GET /api/boards` on mount and renders a clickable list.
- Form at the top creates a board via `POST /api/boards` and navigates to the new board.

### BoardPage (`/board/:id`)
- Fetches `GET /api/boards/:id` on mount to load full board state.
- Shows `GuestAuthModal` if no display name is stored in `sessionStorage`.
- Opens a Socket.io connection and emits `join_board` once a name is set.
- Handles incoming events (`card_added`, `card_moved`, `comment_added`, `column_added`) to update local state immutably.
- Wraps columns in a `DragDropContext`; `onDragEnd` applies an optimistic local update and emits `move_card`.
- "Export CSV" is an anchor tag pointing to `GET /api/boards/:id/export`.

## Components

### GuestAuthModal
Props: `onConfirm(name: string)`

Renders a fullscreen overlay with a text input. On submit, calls `onConfirm` with the trimmed name. The parent stores it in `sessionStorage` under `retro_author_name`.

### Column
Props: `column, authorName, socket, boardId`

Renders a `Droppable` area containing all `Card` components. Has an inline "Add a card" form that emits `add_card` via the socket.

### Card
Props: `card, index, authorName, socket, boardId`

Renders a `Draggable` card. A toggle reveals a comment thread and an inline form that emits `add_comment`. New comments received via `comment_added` are reflected immediately via state updates propagated from the parent BoardPage.

## Development

```bash
# From the client directory
npm run dev      # Start Vite dev server on :5173
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

The Vite dev server proxies `/api/*` and `/socket.io/*` to the backend at `:3001`.
