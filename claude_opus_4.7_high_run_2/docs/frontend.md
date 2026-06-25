# Frontend Architecture

The client is a single-page React app built with Vite. It talks to the backend over REST (initial loads, mutations that don't need broadcast) and Socket.io (real-time collaboration).

## Tech stack

- **React 18** — UI rendering
- **react-router-dom** — client-side routing
- **socket.io-client** — real-time transport with auto-reconnect
- **@hello-pangea/dnd** — drag-and-drop for cards (maintained fork of `react-beautiful-dnd`)
- **Vite** — dev server with HMR and a `/api` + `/socket.io` proxy to the backend

## Routes

| Path                | Component   | Purpose                                |
| ------------------- | ----------- | -------------------------------------- |
| `/`                 | `MainPage`  | List existing boards and create new ones |
| `/boards/:boardId`  | `BoardPage` | Real-time collaborative board view     |

## File layout

```
client/src/
├── main.jsx              # entry: BrowserRouter + ReactDOM.createRoot
├── App.jsx               # header + <Routes>
├── api.js                # fetch wrappers for REST
├── socket.js             # lazy singleton for socket.io-client
├── session.js            # localStorage-backed display name
├── styles.css            # all styles
├── pages/
│   ├── MainPage.jsx      # board list + create form
│   └── BoardPage.jsx     # full collaborative board
└── components/
    ├── GuestAuthModal.jsx # display name prompt
    ├── Column.jsx         # droppable column + add-card form
    └── Card.jsx           # card body + comment thread
```

## State management

State is held locally with `useState`. There is no Redux/Zustand — the data is shallow enough that React state plus reducers (`addCard`, `addComment`, `moveCard`, `addColumn` in `BoardPage.jsx`) is sufficient.

The server is the source of truth. Mutations are:

1. **Optimistic on the actor's client** (drag-and-drop especially), so the user sees an immediate response.
2. **Persisted server-side**, then **broadcast** to every client in `board:<id>`.
3. **Reapplied via the same reducer** when the broadcast arrives. The reducers are de-dupe safe (they early-return if the entity already exists).

## Guest authentication

On entering `/boards/:id` the user is shown `GuestAuthModal` if no display name is set. The name is persisted in `localStorage` under `retro:displayName` and re-used across visits. There is no password, no signup — this is intentional (see `openspec/changes/realtime-retro-board/design.md`).

## Socket lifecycle

`getSocket()` returns a lazily-created singleton. `BoardPage` joins on mount and leaves on unmount:

```js
socket.emit('join_board', { boardId }, (resp) => { ... });
// ...
socket.emit('leave_board', { boardId });
```

It also re-emits `join_board` on the socket's `connect` event so the board state is re-hydrated after a temporary disconnect.

## Drag and drop

`@hello-pangea/dnd` wraps the columns view:

- `<DragDropContext onDragEnd={handleDragEnd}>` — top-level wrapper.
- Each `Column` registers as a `<Droppable droppableId={column.id}>`.
- Each card is a `<Draggable draggableId={card.id} index={index}>`.

`handleDragEnd` applies the move locally (optimistic) and emits `move_card` to the server. The server runs an atomic SQLite transaction to compact source/target column positions and broadcasts `card_moved` to all clients (including the actor, which de-dupes via the reducer's "card already there" check via splice-then-insert semantics).

## Styling

A single `styles.css` defines a dark theme via CSS custom properties on `:root` (`--bg`, `--accent`, etc.). Components use semantic class names — no CSS-in-JS, no preprocessor.

## Adding a new column

Calls `POST /api/boards/:id/columns`. The server persists, then broadcasts `column_added` over the board room, so every connected client picks it up via the `column_added` listener in `BoardPage`.

## Exporting CSV

The "Export CSV" button is a plain `<a>` pointing to `GET /api/boards/:id/export`. The browser handles the download natively via `Content-Disposition`.
