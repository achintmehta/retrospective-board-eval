# Frontend Guide

The client is a React 18 single-page app built with Vite. State management is
intentionally local-only (React `useState` + `useEffect`); the server is the
source of truth and Socket.io broadcasts keep clients in sync.

## Routes

| Path                | Component       | Purpose                                       |
|---------------------|-----------------|-----------------------------------------------|
| `/`                 | `HomePage`      | List boards, create a new board               |
| `/boards/:boardId`  | `BoardPage`     | Board UI with realtime cards + comments       |

Routing is configured in `src/App.jsx` using `react-router-dom`.

## Key Modules

### `src/socket.js`
Lazily creates a single `socket.io-client` instance and reuses it across pages.
The Vite dev server proxies `/socket.io` to the backend on port 4000; in
production the same-origin server hosts both.

### `src/api.js`
Tiny REST wrapper around `fetch`. Throws on non-2xx responses with the server's
error message attached.

### `src/guest.js`
Stores the user's display name in `sessionStorage`. Clearing the tab clears the
identity, matching the "guest, no real auth" model in the spec.

## Pages

### `HomePage`
- Fetches `GET /api/boards` on mount.
- "Create Board" form `POST`s a new board and navigates to `/boards/:id`.

### `BoardPage`
On mount, the page:
1. Reads display name from `sessionStorage`. If missing, renders `GuestNameModal`.
2. Once a name is set, fetches the full board state via `GET /api/boards/:id`.
3. Connects to Socket.io, emits `join_board`, and subscribes to:
   - `card_added` → append to the relevant column
   - `card_moved` → remove from source column, splice into target at `position`
   - `comment_added` → append to the relevant card
   - `column_added` → append a new empty column
4. On disconnect/reconnect, refetches the board to resync.
5. On unmount, removes all listeners and emits `leave_board`.

User actions emit Socket.io events; the server's broadcast is the authoritative
update. The page applies an optimistic update for drag-and-drop so the cursor
doesn't "snap back" while the round trip happens.

## Components

### `GuestNameModal`
Full-screen overlay shown on the board page when no display name is set. On
submit, persists the name to `sessionStorage` and unblocks the board.

### `Column`
Renders a column title, a droppable area of cards, and a footer that toggles
between an "Add card" button and an inline form. Drag-and-drop integration is
provided by `@hello-pangea/dnd`'s `Droppable`.

### `CardItem`
Renders a single card, its author, and a collapsible comments section. The
comments panel includes a form to post new comments. Drag handle is the whole
card.

## Drag and Drop

`@hello-pangea/dnd` wraps the column list in a `DragDropContext` (in
`BoardPage`). On `onDragEnd`:
1. If `destination` is null or matches source, do nothing.
2. Optimistically update local state (`board.columns`).
3. Emit `move_card` to the server with `cardId`, `targetColumnId`, `targetIndex`.

When the server's `card_moved` event arrives, the page reconciles using the
authoritative `position` returned from the database — converging any clients
whose optimistic update was wrong.

## Styling

A single `src/styles.css` defines CSS variables for theming and styles every
component. The layout uses flexbox for the column row (with horizontal scroll
for many columns) and a simple modal pattern for the guest name prompt.

## Building

```bash
npm --prefix client run build
```

Produces `client/dist/`. When `SERVE_CLIENT=true`, the Node server serves this
directory and falls back to `index.html` for SPA routing.
