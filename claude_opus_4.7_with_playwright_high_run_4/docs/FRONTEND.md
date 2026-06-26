# Frontend

The client is a Vite + React 18 single-page app written in JSX. It depends on React Router for navigation, `@hello-pangea/dnd` for drag-and-drop, and `socket.io-client` for realtime updates.

## Structure

```
client/
├── index.html
├── vite.config.js   # Dev proxy: /api and /socket.io → http://localhost:3001
└── src/
    ├── main.jsx       # Wires BrowserRouter + StrictMode
    ├── App.jsx        # Layout shell and route definitions
    ├── api.js         # Tiny fetch wrapper for the REST API
    ├── socket.js      # Lazy singleton socket.io-client
    ├── styles.css     # All app styling
    ├── pages/
    │   ├── MainPage.jsx   # Board list + "create board" form
    │   └── BoardPage.jsx  # Realtime board view (sockets, drag/drop)
    └── components/
        ├── GuestAuthModal.jsx  # Display-name prompt
        ├── Column.jsx          # Droppable column + add-card form
        └── Card.jsx            # Draggable card + comments
```

## Routes

- `/` — `MainPage`. Lists boards (`GET /api/boards`) and exposes a creation form (`POST /api/boards`).
- `/boards/:id` — `BoardPage`. Loads the board with `GET /api/boards/:id`, then opens a Socket.io connection and joins the board's room.

## State and data flow

`BoardPage` keeps the entire board (`{ columns: [{ cards: [{ comments: [] }] }] }`) in a single `useState`. Updates come from two sources:

1. **User actions** — handlers emit Socket.io events (`add_card`, `move_card`, `add_comment`). Drag-and-drop also applies an optimistic local update for snappy feedback.
2. **Server broadcasts** — incoming `card_added`, `card_moved`, `comment_added`, and `column_added` events mutate state idempotently (each handler checks whether the entity already exists, so duplicate events from optimistic-then-broadcast paths are safe).

On `connect` (and reconnect), the page re-emits `join_board` and refetches the full board to recover from any missed events during the disconnect window.

## Guest sessions

`BoardPage` reads the display name from `sessionStorage` (key `retro:displayName`). If the name is missing it renders `GuestAuthModal`, which prompts for a name and stores it. The same name is sent on every `join_board`.

## Drag and drop

`@hello-pangea/dnd` (a maintained fork of `react-beautiful-dnd`) wraps the columns in `<DragDropContext>` → `<Droppable>` → `<Draggable>`. The page handles `onDragEnd` by:

1. Updating local state optimistically (move the card in the column array).
2. Emitting `move_card` to the server.

The server responds with a `card_moved` broadcast; the local handler is idempotent so re-applying the move is a no-op.

## Styling

A single `styles.css` provides the layout (CSS Grid for the columns), card visuals, and modal. No CSS-in-JS or component library is used.

## Building

- `npm run dev` (from project root) starts Vite at `:5173` with API/WS proxying to the backend at `:3001`.
- `npm run build` runs `vite build` and emits `client/dist/`. The Express server serves these static files in production and falls back to `index.html` for client-side routes.
