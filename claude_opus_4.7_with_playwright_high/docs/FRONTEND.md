# Frontend

The frontend is a Vite + React 18 single-page app located under `client/`.

## Entry points

| File                            | Role                                                                |
| ------------------------------- | ------------------------------------------------------------------- |
| `src/main.jsx`                  | App bootstrap; mounts the BrowserRouter and global stylesheet.      |
| `src/api.js`                    | Thin `fetch` wrapper exposing the REST endpoints.                   |
| `src/pages/HomePage.jsx`        | `/` — list boards, create a new one.                                |
| `src/pages/BoardPage.jsx`       | `/boards/:id` — board view; owns the Socket.io connection.          |
| `src/components/GuestAuthModal` | Display-name prompt shown before the board renders.                 |
| `src/components/Card.jsx`       | Card + nested comment thread.                                       |
| `src/styles.css`                | Global styles (dark theme).                                         |

## Routing

```
/                  → HomePage
/boards/:id        → BoardPage
```

Configured in `src/main.jsx` with `react-router-dom@6`.

## State model

There is no global store. Each page owns its data:

- `HomePage` keeps the board list in local `useState`. After `POST /api/boards`
  it navigates straight to the new board.
- `BoardPage` keeps the entire board tree in a single `board` state object and
  patches it in place when Socket.io broadcasts arrive. The patches mirror the
  three broadcast events 1:1 (`card_added`, `card_moved`, `comment_added`).
- `GuestAuthModal` exists purely as a gate: until `sessionStorage` has a
  `retroboard.displayName`, the board page renders the modal instead of the
  board. Persisting in `sessionStorage` (not `localStorage`) means each tab is
  its own session.

## Socket.io integration

`BoardPage` opens a single Socket.io connection inside a `useEffect` keyed on
`(boardId, displayName)`:

1. `socket.emit('join_board', { boardId })` immediately after connect.
2. Subscribe to `card_added` / `card_moved` / `comment_added` and apply the
   change to local state.
3. On `disconnect`, the next `connect` triggers a re-join and a fresh
   `GET /api/boards/:id` to recover from any missed events.
4. Cleanup leaves the room and disconnects when the component unmounts.

Outbound actions (`add_card`, `move_card`, `add_comment`) are emitted from event
handlers. We do not apply optimistic UI updates — every change is applied when
the server broadcasts it back, which keeps state identical to what other
clients see.

## Drag and drop

Cards live inside `@hello-pangea/dnd` (`Droppable` per column, `Draggable` per
card). `onDragEnd` derives the destination column ID and index, then emits a
`move_card` event. Cards re-render from the server's `card_moved` broadcast.

## Build / dev

- **Dev**: `npm run dev` (at repo root) starts both the API and Vite with a
  proxy on `/api` and `/socket.io` → `http://localhost:3001`.
- **Production**: `npm run build` writes `client/dist/`. In production, the
  Express server serves `client/dist` and falls back to `index.html` for any
  non-API path (see `server/index.js`), so the SPA's deep links work on reload.

## Styling

A single `styles.css` defines a dark theme with CSS variables (`--bg`,
`--panel`, `--accent`, etc.). All components use semantic class names; there
is no CSS-in-JS or utility framework.
