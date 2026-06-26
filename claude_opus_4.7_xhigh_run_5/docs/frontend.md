# Frontend Guide

The frontend is a React 18 single-page app built with Vite. It talks to the backend via REST for board metadata and Socket.io for everything collaborative.

## Stack

- **React 18** with React Router 6
- **Vite 5** dev server + production build
- **socket.io-client** for the realtime channel
- **@hello-pangea/dnd** for drag-and-drop between columns
- Plain CSS (no UI framework) — styles live in `src/styles.css`

## Running

```sh
npm install
npm run dev       # http://localhost:5173 (proxies /api and /socket.io to :3001)
```

For production, `npm run build` emits `client/dist/`, which the Node server serves directly when present.

## Routes

| Path           | Component        | Purpose                                  |
| -------------- | ---------------- | ---------------------------------------- |
| `/`            | `MainPage`       | List existing boards + create new boards |
| `/boards/:id`  | `BoardPage`      | Realtime board (columns, cards, DnD)     |
| `*`            | `NotFound`       | Fallback                                  |

## Key files

```
client/src/
  main.jsx                 Vite entry, mounts <BrowserRouter><App/>
  App.jsx                  Route table + header
  api.js                   Thin fetch wrapper for /api/*
  socket.js                Lazy socket.io-client singleton
  pages/
    MainPage.jsx           Create board form + list of boards
    BoardPage.jsx          Board state, socket subscriptions, drag-and-drop
  components/
    GuestAuthModal.jsx     Display-name prompt
    Column.jsx             Droppable column with add-card form
    Card.jsx               Draggable card + collapsible comments
  styles.css
```

## State flow

1. `BoardPage` mounts, reads `displayName` from `localStorage`.
2. If no name is stored, it renders `GuestAuthModal` instead of the board.
3. Once the name is set, the page:
   - Fetches the full board via `GET /api/boards/:id` for an instant initial render.
   - Opens (or reuses) the singleton socket and emits `join_board` with the display name. The ack response returns the authoritative board state and replaces the local copy.
4. Subsequent socket events (`card_added`, `card_moved`, `comment_added`) merge into local state.
5. User actions (add card, move card, add comment, add column) emit socket events with an ack callback for error surfacing.

### Drag and drop

`@hello-pangea/dnd` wraps each column in a `<Droppable>` and each card in a `<Draggable>`. `handleDragEnd` computes a new fractional `position` as the midpoint between the destination's neighbors, applies an optimistic update, and emits `move_card`. The server is the source of truth, so any divergence is corrected on the next `card_moved` event.

### Guest auth

`localStorage.retro.displayName` persists the chosen name across sessions for the same browser. The modal short-circuits the board UI when the value is missing or empty.

## Adding new realtime events

1. Implement the handler in `src/sockets.js` (server).
2. Add the emit/subscribe in `BoardPage.jsx`.
3. Update the merge helpers (`mergeCard`, `mergeComment` etc.) so incoming broadcasts are folded into board state.
4. Update `docs/api.md` with the new event shape.

## Styling

Styles are intentionally simple. The board uses a horizontal scrolling Kanban layout (`display: flex; overflow-x: auto`). Each column is `300px` wide and `flex: 0 0 300px` so they don't shrink. Drop zones highlight while dragging via the `.over` class set by the `isDraggingOver` snapshot.

## Build output

`vite build` produces:

```
client/dist/
  index.html
  assets/index-<hash>.js
  assets/index-<hash>.css
```

When the Node server boots and `client/dist/` exists, it serves the static assets and falls back to `index.html` for any non-API/non-socket path so client-side routing works on deep links.
