# Frontend Architecture

The frontend is a React single-page application built with Vite.

## Key libraries

| Library | Purpose |
|---------|---------|
| `react-router-dom` v6 | Client-side routing |
| `socket.io-client` | Real-time WebSocket connection |
| `@hello-pangea/dnd` | Drag-and-drop for cards |

## Pages

### `MainPage` (`/`)

- Fetches the board list from `GET /api/boards` on mount.
- Submitting the form calls `POST /api/boards` and navigates to the new board.

### `BoardPage` (`/board/:id`)

- On mount, fetches full board data from `GET /api/boards/:id`.
- If no display name is stored in `sessionStorage`, shows `GuestAuthModal`.
- Once a name is set, connects to Socket.io and emits `join_board`.
- Listens for `card_added`, `card_moved`, `comment_added`, and `column_added` events to update local state.
- On reconnect, refetches full board state to reconcile any missed events.
- Drag-and-drop is handled by `DragDropContext` from `@hello-pangea/dnd`; the `onDragEnd` handler emits `move_card` and applies an optimistic local update.

## Components

### `GuestAuthModal`

A blocking modal overlay. Persists the entered name to `sessionStorage` so users are not re-prompted on page refresh within the same browser tab session.

### `Column`

Wraps a `Droppable` zone from `@hello-pangea/dnd`. Renders a list of `Card` components and an inline "Add Card" form.

### `Card`

Wraps a `Draggable` from `@hello-pangea/dnd`. Displays card content and author. A toggle reveals the comments section and an inline comment input.

## State management

All state is local React state in `BoardPage`. The board object shape mirrors the REST API response:

```
board
  └── columns[]
        └── cards[]
              └── comments[]
```

Socket events mutate this tree immutably via `setBoard`.

## Development proxy

`vite.config.js` proxies `/api` and `/socket.io` to `http://localhost:3001` so the frontend dev server and backend can run on different ports without CORS issues.
