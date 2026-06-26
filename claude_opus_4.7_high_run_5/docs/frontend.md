# Frontend Architecture

The frontend is a small Vite + React SPA. There is intentionally no global
state library — board state is owned by `BoardPage` via a reducer hook, and
the socket and session helpers are tiny modules.

## Entry points

- `client/index.html` — Vite entrypoint, mounts `#root`.
- `src/main.jsx` — sets up React Router with two routes:
  - `/` → `HomePage`
  - `/boards/:boardId` → `BoardPage`
- `src/App.jsx` — layout shell with header + `<Outlet />`.

## Modules

### `src/api.js`

Thin fetch wrapper exposing:

| Method                       | Purpose                          |
| ---------------------------- | -------------------------------- |
| `api.listBoards()`           | `GET /api/boards`                |
| `api.createBoard(title)`     | `POST /api/boards`               |
| `api.getBoard(id)`           | `GET /api/boards/:id`            |
| `api.addColumn(boardId, t)`  | `POST /api/boards/:id/columns`   |
| `api.exportUrl(boardId)`     | URL for the CSV export endpoint  |

In development, the Vite dev server proxies `/api` to the backend
(`vite.config.js`).

### `src/socket.js`

Lazily creates and caches a single `socket.io-client` instance. Same
process serves the websocket as the API in production; in dev, Vite
proxies the `/socket.io` upgrade to the backend.

### `src/session.js`

Stores the user's display name in `sessionStorage` under
`retro-board:displayName`. The choice of `sessionStorage` (vs.
`localStorage`) means each browser tab is its own session, which matches
the "guest session" model in the spec.

## Pages

### `HomePage`

- Lists boards from `GET /api/boards`.
- Form for creating a board; on success navigates to `/boards/:id`.

### `BoardPage`

Owns most of the real-time logic:

1. On mount, reads the display name from sessionStorage. If absent,
   renders `<NamePrompt>` and stores the name.
2. Opens a socket and emits `join_board`. The ack contains the full board
   state, which seeds the reducer.
3. Subscribes to `card_added`, `card_moved`, `comment_added`,
   `column_added`. Each event dispatches into the reducer.
4. Renders columns inside a `DragDropContext`. On `onDragEnd`:
   - Applies an **optimistic local update** via `moveCard`.
   - Emits `move_card` to the server. The server's broadcast (which the
     local client also receives) is idempotent against the optimistic
     update.
5. "Export to CSV" is a plain `<a download href="…/export">` — no JS needed.

### `useBoardState` (reducer)

Holds the full board tree. Actions:

| Action          | Effect                                                              |
| --------------- | ------------------------------------------------------------------- |
| `set_board`     | Replace state (used by `join_board` ack and reconnect refresh).     |
| `add_column`    | Append column. Idempotent on duplicate IDs.                         |
| `add_card`      | Append card into its column, sorted by position. Idempotent.        |
| `move_card`     | Remove card from source column, insert at target index, re-index.   |
| `add_comment`   | Append comment to its card. Idempotent on duplicate IDs.            |

Every reducer case is idempotent against duplicate IDs to handle the
optimistic-update + broadcast echo without flicker or duplication.

## Components

- `Column` — column header, droppable card list, "Add card" affordance.
- `Card` — card content, author, comment toggle, comment list, comment form.
- `NamePrompt` — modal asking for a display name on first board visit.

## Styling

All styles live in `src/styles.css`. The palette is a dark slate theme
with an indigo accent. CSS variables at the top make recoloring trivial.
No CSS framework or preprocessor — keep dependencies lean.

## Drag and drop

We use `@hello-pangea/dnd` (the maintained fork of `react-beautiful-dnd`).
Columns are `Droppable`s with `droppableId` = column id; cards are
`Draggable`s with `draggableId` = card id. Source/destination column ids
come straight from the drag result, so wiring into the server's
`move_card` API requires no additional bookkeeping.
