# Frontend Documentation

## Technology

- **Framework**: React 19 via Vite
- **Routing**: `react-router-dom` v7
- **Real-time**: `socket.io-client` v4
- **Drag & Drop**: `@hello-pangea/dnd`
- **Styling**: Vanilla CSS (dark theme, glassmorphism, Inter font)

## File Structure

```
client/src/
├── main.jsx              # Entry point, mounts React app
├── App.jsx               # BrowserRouter + Routes
├── index.css             # Global design system (tokens, utilities, components)
├── pages/
│   ├── MainPage.jsx      # Board listing + create board form
│   └── BoardPage.jsx     # Board view with columns, cards, drag-drop, comments
└── components/
    ├── Column.jsx         # Droppable column with card list and add-card form
    ├── Card.jsx           # Draggable card with author/comment count meta
    └── GuestAuthModal.jsx # Display name prompt shown before board interaction
```

## Pages

### MainPage (`/`)
- Fetches all boards on mount via `GET /api/boards`
- Create board form: POST to `/api/boards` → navigates to `/board/:id`
- Displays boards in a responsive grid

### BoardPage (`/board/:boardId`)
- Shows `GuestAuthModal` if no `retro_author` in `sessionStorage`
- Fetches full board state on mount via `GET /api/boards/:boardId`
- Connects Socket.io on mount, joins the board room, disconnects on unmount
- Manages optimistic UI updates for drag-and-drop (card move)
- Card click opens an inline comment modal
- Export CSV triggers `window.location.href` redirect to the export endpoint

## State Management

Local `useState` per component. The `BoardPage` holds the canonical board state and passes update functions down via props.

Socket.io events mutate state via `setBoard` using functional updates (immutable patterns) to safely update nested structures:
- `card_added` → appends card to the matching column
- `card_moved` → removes card from old column, inserts at new position
- `comment_added` → appends comment to the matching card
- `column_added` → appends column to board

## Socket Connection

A module-level singleton `socket` is used to avoid reconnections on re-renders:

```js
let socket = null;
function getSocket() {
  if (!socket) socket = io({ transports: ['websocket', 'polling'] });
  return socket;
}
```

The Vite dev proxy (`vite.config.js`) transparently forwards both `/api` HTTP requests and `/socket.io` WebSocket connections to `http://localhost:3001`.

## Drag & Drop

Uses `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd):
- `DragDropContext` wraps the entire columns area in `BoardPage`
- Each `Column` renders a `Droppable` with the column `id` as `droppableId`
- Each `Card` renders as a `Draggable` with the card `id`
- `onDragEnd` emits `move_card` via Socket.io and applies an optimistic state update

## Design System

All styles live in `index.css`. CSS custom properties define the palette:

| Token | Value |
|---|---|
| `--bg-base` | `#0d0f1a` (page background) |
| `--accent-1` | `#6366f1` (indigo) |
| `--accent-2` | `#8b5cf6` (violet) |
| `--gradient` | indigo → violet |

Key utility classes: `.btn`, `.btn-primary`, `.btn-ghost`, `.input`, `.glass`, `.modal`, `.modal-overlay`.
