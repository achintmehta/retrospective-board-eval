# Frontend Reference

The client is a Vite + React 18 single-page app written in TypeScript. State
is local to each page (no Redux); the server is the source of truth and pushes
updates over Socket.io.

## Stack

- **Vite 5** — dev server + production bundler.
- **React 18** + `react-router-dom` v6.
- **`@hello-pangea/dnd`** — drag-and-drop for cards (a maintained fork of
  `react-beautiful-dnd`, works with React 18).
- **`socket.io-client`** — real-time channel; shares the connection across
  routes via a singleton.

## File layout

```
client/
├── index.html
├── vite.config.ts          # Dev server with /api + /socket.io proxy to :3000
└── src/
    ├── main.tsx            # Router setup
    ├── App.tsx             # Shell (header + <Outlet />)
    ├── api.ts              # fetch() wrappers for REST endpoints
    ├── socket.ts           # io() singleton
    ├── session.ts          # localStorage display-name helpers
    ├── styles.css          # All styling (single stylesheet)
    ├── types.ts            # Board / Column / Card / Comment shapes
    ├── pages/
    │   ├── MainPage.tsx    # Board list + Create Board form
    │   └── BoardPage.tsx   # The live board (sockets, DnD, modal)
    └── components/
        ├── GuestAuthModal.tsx  # Prompts for a display name
        ├── AddColumnForm.tsx   # Inline column-creation form
        ├── AddCardForm.tsx     # Inline card-creation form
        └── CommentsModal.tsx   # Card detail + comment thread
```

## Routing

```
/                       → MainPage
/boards/:boardId        → BoardPage
```

Both routes share `App.tsx` as their layout. Direct deep links work because
the server falls back to `index.html` for any non-API, non-socket path.

## Pages

### `MainPage`

- On mount, `GET /api/boards` populates the list.
- The "Create Board" form `POST`s to `/api/boards`, then navigates to
  `/boards/:id`.
- Errors surface inline under the form.

### `BoardPage`

Handles the real-time experience:

1. On mount, `GET /api/boards/:id` fetches the initial snapshot.
2. If no display name is stored, `GuestAuthModal` blocks interaction. Once
   submitted, the name is persisted in `localStorage` under
   `retro-board.display-name`.
3. With a name in hand, the page calls `socket.emit("join_board", ...)`. The
   ack returns the latest server state, which replaces the initial snapshot
   to avoid drift if anything changed between the REST fetch and socket join.
4. Subscribes to `card_added`, `card_moved`, and `comment_added` broadcasts
   and merges them into local state via small reducers (`upsertCard`,
   `appendComment`, `addColumn`).
5. Drag-and-drop is wired with `<DragDropContext>` → `<Droppable>` (one per
   column) → `<Draggable>` (one per card). `onDragEnd` emits `move_card`
   with the destination column id and index; the server normalizes the
   positions and broadcasts `card_moved` back to every client (including the
   originating one).
6. Adding a column is a REST call (`POST /api/boards/:id/columns`) rather
   than a socket event, since column edits are infrequent and the response
   is consumed directly by the calling client.
7. Clicking a card opens `CommentsModal`, where new comments are emitted
   via `add_comment`. The modal re-renders from the shared board state, so
   replies posted by other users appear immediately.

## Real-time state model

The client stores a single `BoardDetail` object. When the server broadcasts
an update, the corresponding helper produces a new immutable copy:

- `upsertCard(board, card)` — moves the card into `card.columnId`, removes
  it from any other column, preserves the existing comments array if the
  broadcast omits comments (the server only sends comments on the initial
  snapshot).
- `appendComment(board, comment)` — adds the comment to the target card and
  dedupes by id.
- `addColumn(board, column)` — appends a newly-created column.

`sortCards()` orders cards by `position` then `createdAt`, matching the
server's sort and keeping the DnD index in sync with what the user sees.

## Connection status

The header shows `● live` when the socket is connected and
`● reconnecting…` otherwise. Socket.io handles reconnection automatically;
on reconnect the page rejoins the board room and the server replies with the
fresh state, so any divergence during a brief disconnect is healed.
