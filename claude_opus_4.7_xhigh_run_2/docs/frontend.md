# Frontend guide

The frontend is a small Vite + React 18 SPA. There is no global state library — board state lives in the `BoardPage` component and is mutated by both REST responses and Socket.io broadcasts.

## Entrypoints

| File | Role |
| --- | --- |
| `client/index.html` | Vite document shell |
| `client/src/main.jsx` | Mounts `<App />` inside `<BrowserRouter>` |
| `client/src/App.jsx` | Header + route table (`/` and `/boards/:boardId`) |
| `client/src/styles.css` | All app styles (CSS variables, no preprocessor) |

## Pages

### `pages/MainPage.jsx`

- Loads `GET /api/boards` on mount.
- Form submission calls `POST /api/boards` then navigates to `/boards/:id`.
- Shows existing boards as links sorted newest-first.

### `pages/BoardPage.jsx`

- Loads `GET /api/boards/:id` and renders a Kanban-style layout.
- Wires up the singleton `socket.js`:
  - `connect` → emits `join_board`.
  - `reconnect` → re-emits `join_board` and re-fetches the board.
  - Subscribes to `card_added`, `card_moved`, `comment_added`, `column_added`.
- Drag-and-drop is implemented with `@hello-pangea/dnd`. The `onDragEnd` handler does an optimistic reorder, then emits `move_card`; if the server rejects, the board is re-fetched to reconcile.
- Hosts the **Export CSV** link (`/api/boards/:id/export`) and a small inline form for adding new columns.

## Components

| Component | Responsibility |
| --- | --- |
| `GuestAuthModal` | Renders a blocking modal until the visitor supplies a display name. Saves into `sessionStorage` via `session.js`. |
| `AddCardForm` | Per-column textarea + button. Emits `add_card` over the socket. |
| `Card` | Single card view, draggable handle, and a collapsible comment section. |
| `CommentSection` | Lists existing comments and emits `add_comment` for new ones. |

## State updates

The applier functions inside `BoardPage.jsx` (`applyCardAdded`, `applyCardMoved`, `applyCommentAdded`, `applyColumnAdded`, `applyOptimisticMove`) are pure helpers. They always produce a new `board` object so React picks up the change, and they de-duplicate on `id` so optimistic updates merge cleanly with the server broadcast.

## Sessions

`session.js` stores the chosen display name under `sessionStorage['retro:displayName']`. Refreshing the tab keeps the user signed in; closing the tab forgets them. There is no server-side identity — names are simply attached to socket events as `authorName`.

## Styling

A small palette is defined as CSS variables on `:root` and used throughout `styles.css`. Columns scroll horizontally on narrow viewports; cards wrap content with `white-space: pre-wrap`.

## Build

`npm --prefix client run build` produces `client/dist/`. When the backend boots it serves this directory (and falls back to `index.html` for client-side routes), so the production deployment is a single Express process.
