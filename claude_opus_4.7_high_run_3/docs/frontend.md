# Frontend Architecture

The frontend is a small Vite + React app. It is deliberately framework-light — no Redux, no React Query — because the data flow is straightforward: REST for initial load, Socket.io for live updates.

## Stack

| Concern | Choice |
| ------- | ------ |
| Build tool | Vite |
| UI | React 18 |
| Routing | `react-router-dom` v6 |
| Drag and drop | `@hello-pangea/dnd` |
| Real-time | `socket.io-client` |
| Styling | Plain CSS (single `styles.css`) |

## File Layout

```
client/src/
├── main.jsx                Router + root render
├── App.jsx                 App shell (header + <Outlet/>)
├── api.js                  Tiny fetch wrapper
├── session.js              Display-name persistence (sessionStorage)
├── styles.css              All styles
├── pages/
│   ├── HomePage.jsx        Board list + create form
│   └── BoardPage.jsx       Live board view
└── components/
    ├── GuestAuthModal.jsx  Display-name prompt
    ├── Column.jsx          Single column with cards + add-card form
    └── CardItem.jsx        Single card with comment thread
```

## Routes

| Path | Component | Purpose |
| ---- | --------- | ------- |
| `/`  | `HomePage` | List boards, create new board |
| `/boards/:boardId` | `BoardPage` | View and collaborate on a board |

## Guest Session

`session.js` stores the display name in `sessionStorage` under `retro:displayName`. The Board Page renders `GuestAuthModal` until a name is set. The name lives only for the tab session — closing the tab forgets it.

## Data Flow

1. **Initial load.** `BoardPage` calls `GET /api/boards/:id` via `api.js`. The response includes columns, cards, and comments fully embedded.
2. **Socket connect.** Once the display name is set, `BoardPage` opens a Socket.io connection, joins `board:<boardId>`, and registers listeners for `card_added`, `card_moved`, `comment_added`.
3. **User actions.** Adding a card, moving a card, and commenting all emit Socket.io events. The server persists to SQLite and broadcasts the resulting event to the room, so every client (including the emitter) updates from the broadcast.
4. **Optimistic UI for drags.** `handleDragEnd` mutates local state immediately, then emits `move_card`. The server broadcast is idempotent against this optimistic update.
5. **Reconnects.** On `socket.io.reconnect`, the client re-joins the room and re-fetches the board to guarantee consistency.

## Drag and Drop

`@hello-pangea/dnd` provides `<DragDropContext>` / `<Droppable>` / `<Draggable>`. Each `Column` is a Droppable keyed by `column.id`; each `CardItem` is a Draggable keyed by `card.id`. On drop, we emit `move_card` with the destination column and index.

## Adding Columns

Adding a column is the only mutation that goes through REST (`POST /api/boards/:id/columns`). After the call returns, the page refetches the board. This is a deliberate simplification — columns change rarely compared to cards, and skipping real-time saves a socket handler.

## Styling

All styles live in `client/src/styles.css`. Variables at the top of the file (`:root { ... }`) control the palette. The board is a horizontally-scrolling row of fixed-width columns — Trello-style.

## Dev Server Proxy

`vite.config.js` proxies `/api` and `/socket.io` to `http://localhost:3001` so the dev server and backend coexist on different ports without CORS headaches.
