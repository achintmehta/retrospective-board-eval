# Frontend Reference

Vite + React app located in `client/`. No Redux, no global state library — local component state plus a single Socket.io connection per board.

## Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `pages/MainPage.jsx` | List existing boards and create new ones |
| `/boards/:boardId` | `pages/BoardPage.jsx` | Live board with drag-and-drop, comments, export |

Routes are mounted in `src/main.jsx` inside a `BrowserRouter`. The `App.jsx` shell renders a header and an `<Outlet />`.

## State on `BoardPage`

1. **Display name** — read from `localStorage` via `session.js`. If missing, `GuestNameModal` is rendered and nothing else happens until the user submits a name.
2. **Board snapshot** — fetched from `GET /api/boards/:id` once on mount and on every Socket.io reconnect.
3. **Socket connection** — `io()` is created in a `useEffect` that depends on `displayName` and `boardId`. On `connect`, the client emits `join_board`. The handler also subscribes to:
   - `card_added` → insert the card into the matching column.
   - `card_moved` → splice the card out of its source column and into the destination at `toPosition`.
   - `comment_added` → append the comment to the matching card (deduped by `id`).

Each reducer is a pure function (`applyCardAdded`, `applyCardMoved`, `applyCommentAdded`) so socket events and optimistic local updates share the same code path.

### Optimistic drag-and-drop

When the user drops a card, the client immediately calls `applyCardMoved` on local state (so the UI doesn't snap back), then emits `move_card` to the server. The server broadcasts `card_moved` back to all rooms members — including the one who initiated the move — so reconnects and divergent clients converge to the same state.

### Reconnection

`socket.io.on('reconnect')` refetches the full board snapshot and re-emits `join_board`. This is the recovery path for any events missed while the client was offline.

## Components

| Component | Responsibility |
|-----------|----------------|
| `App.jsx` | Layout shell: header + `<Outlet />` |
| `pages/MainPage.jsx` | Board list, "create board" form |
| `pages/BoardPage.jsx` | Socket lifecycle, columns layout, drag-and-drop, "add column" |
| `components/GuestNameModal.jsx` | First-time display-name prompt |
| `components/CommentsPanel.jsx` | Modal that shows a card's comments and a comment composer |

`BoardPage` also contains a small `BoardColumn` subcomponent (in the same file) that owns the per-column "add card" textarea.

## Drag-and-drop

Built on `@hello-pangea/dnd` (maintained fork of `react-beautiful-dnd`):

- `<DragDropContext onDragEnd>` wraps the board.
- Each column is a `<Droppable droppableId={column.id}>`.
- Each card is a `<Draggable draggableId={card.id} index={i}>`.
- `onDragEnd` ignores drops outside any droppable and pure no-ops. Otherwise it applies the optimistic local update and emits `move_card`.

## Talking to the backend

`src/api.js` is a thin `fetch` wrapper around `/api/*`. It throws `Error(body.error)` for non-2xx responses so callers can `try/catch`.

`src/session.js` is a 3-function wrapper around `localStorage` for the display name (`get`, `set`, `clear`).

## Adding a feature

To add a new real-time event, e.g. *delete card*:

1. Add a DAO function in `server/dao.js`.
2. Register a handler in `server/sockets.js` that calls the DAO and broadcasts a new event.
3. Add a reducer alongside `applyCardAdded` in `client/src/pages/BoardPage.jsx` and subscribe to the new event inside the socket `useEffect`.
4. Emit the new event from the relevant UI handler via the existing `emit` helper.

That's the full cycle — keeping the protocol additive avoids breaking older clients.

## Styling

A single hand-rolled `styles.css` file. No CSS-in-JS or framework. Variables at the top control the small palette; everything else is plain class selectors matching the JSX. Substituting Tailwind or any component library is a drop-in refactor.
