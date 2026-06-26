# Frontend Architecture

The frontend is a Vite + React 18 single-page app, using React Router for navigation and Socket.io for real-time updates. State is local to each page component; the server is the source of truth.

## Stack

- **Vite** — dev server and production bundler
- **React 18** + **react-router-dom** — UI and routing
- **socket.io-client** — WebSocket transport with auto-reconnect
- **@hello-pangea/dnd** — drag-and-drop for cards

## Routes

| Path | Component | Purpose |
| --- | --- | --- |
| `/` | `HomePage` | List boards, create a new one |
| `/boards/:boardId` | `BoardPage` | Real-time retro board UI |

## Files

```
client/src/
  main.jsx              React entry point; wires BrowserRouter
  App.jsx               App shell (header + <Routes>)
  api.js                Tiny fetch wrapper for /api endpoints
  socket.js             Singleton accessor for the Socket.io client
  styles.css            Global styles
  pages/
    HomePage.jsx        List + create boards
    BoardPage.jsx       Loads board, joins room, handles real-time events + DnD
  components/
    NamePrompt.jsx      Modal asking for display name on first board visit
    Column.jsx          Renders one column + drop target + add-card form
    Card.jsx            Renders one card + collapsible comments + add-comment form
```

## State flow

1. `BoardPage` mounts and calls `GET /api/boards/:id` to get the initial tree.
2. If no display name is in `sessionStorage`, `NamePrompt` modal blocks interaction.
3. Once the user submits a name, the page:
   - Stores it under `retro-board:display-name` in `sessionStorage`.
   - Connects (lazily) to Socket.io and emits `join_board`.
   - Registers listeners for `card_added`, `card_moved`, `comment_added`, and `column_added`.
4. User actions (`add_card`, `add_comment`, `move_card`) are emitted to the server; the server broadcasts the canonical change back to the room.
5. Drag-and-drop updates the local state **optimistically** (so the UI feels instant), then emits `move_card`. If the server later broadcasts a corrective ordering, the local state is replaced.
6. On reconnect, the client re-emits `join_board` and refetches the board to re-sync.

## Real-time updates

Each Socket.io event updates the local `board` state immutably:

| Event | Effect |
| --- | --- |
| `card_added` | Append `card` to the matching column's `cards` array |
| `card_moved` | Remove from `fromColumnId`, splice into `toColumnId` at `toPosition` |
| `comment_added` | Append `comment` to the matching card's `comments` array |
| `column_added` | Append column to `board.columns` if not already present |

## Guest auth

There is no login. The display name is stored in `sessionStorage` (not `localStorage`), so closing the tab clears it. The server reads `socket.data.displayName` for every action; cards and comments are tagged with that name.

## Drag and drop

`@hello-pangea/dnd` (a maintained fork of `react-beautiful-dnd`) wraps the columns in a single `DragDropContext`. Each column is a `Droppable`; each card is a `Draggable`. On drag end, `handleDragEnd` in `BoardPage` performs the optimistic move and emits `move_card` to the server.

## Dev mode

`npm run dev` runs the Vite dev server on `:5173` with `/api` and `/socket.io` proxied to the backend on `:3001` (see `vite.config.js`). HMR works for component changes; the backend restarts on save via `node --watch`.

## Production build

`vite build` outputs static assets to `client/dist/`. The Express server, when started in any mode where that directory exists, serves the assets directly and falls back to `index.html` for non-`/api`, non-`/socket.io` routes (so React Router deep links work after refresh).
