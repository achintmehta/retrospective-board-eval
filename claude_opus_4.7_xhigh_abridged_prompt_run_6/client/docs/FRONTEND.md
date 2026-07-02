# Frontend Architecture

The frontend is a Vite + React + TypeScript SPA. It talks to the backend via REST for reads
and mutations that need a response body, and via Socket.io for live collaboration events.

## Structure

```
client/src/
├── main.tsx              # React entry (BrowserRouter)
├── App.tsx               # Layout shell + routes
├── styles.css            # Design tokens + global styles
├── api.ts                # REST helpers and shared types
├── socket.ts             # Lazy Socket.io singleton
├── session.ts            # Display name in localStorage
├── pages/
│   ├── HomePage.tsx      # List + create boards
│   └── BoardPage.tsx     # Real-time board with drag-and-drop
└── components/
    ├── NameGate.tsx      # Guest auth modal
    ├── CardView.tsx      # Draggable card + drag overlay
    ├── AddCardForm.tsx   # Inline "add card" form
    └── CardDetailModal.tsx # Card detail + comments thread
```

## Routing

- `/` — `HomePage`: renders the "Create board" panel and the list of existing boards.
- `/boards/:id` — `BoardPage`: renders the columns, wires up sockets, and handles drag-and-drop.
- `*` — a minimal empty state.

## State model

`BoardPage` owns the entire `BoardDetail` object. Real-time events (`card_added`,
`card_moved`, `comment_added`, `column_added`) are folded into the local state via pure
reducer helpers at the bottom of `BoardPage.tsx`.

- **Optimistic updates:** the drop handler updates state immediately, then emits `move_card`.
  If the ack is `{ ok: false }`, we refetch the board.
- **Reconciliation:** on socket `connect` (including reconnects), we always refetch the
  board so state cannot drift after a network blip.
- **De-duplication:** every reducer checks for an existing ID before appending so the
  broadcasted event that returns to the emitter doesn't produce duplicates.

## Guest session

`session.ts` reads/writes a display name in `localStorage`. `BoardPage` gates all
interactions behind `NameGate` until a name is present. There is no server-side session.

## Real-time layer

`socket.ts` exposes a lazy singleton. `BoardPage` subscribes only after a board and name
are known, and cleans up its listeners on unmount. `leave_board` is emitted on unmount so
subsequent broadcasts skip the client.

## Drag-and-drop

Built on `@dnd-kit/core` + `@dnd-kit/sortable`:

- Each column is a `useDroppable` with `data: { type: 'column' }`.
- Each card is a `useSortable` with `data: { type: 'card', card }`.
- `closestCorners` is used for collision detection, which works well for vertical stacks.
- On drop, we compute `(to_column_id, to_position)` and emit `move_card`. Empty columns
  are detected via `data.current.type === 'column'`.
- A `DragOverlay` renders a tilted "ghost" of the moving card for polish.

## Design system

Tokens live in `styles.css` under `:root`. The palette is a curated dark theme:

- **Backdrop:** layered radial + linear gradients with three animated blurred orbs.
- **Surface:** translucent, backdrop-blurred panels with subtle purple borders.
- **Column accents:** `data-accent` on the column node picks the gradient (`emerald`,
  `rose`, `amber`, `violet`, `sky`, `fuchsia`), used for the header bar and each card's
  left rail.
- **Typography:** Outfit for display headings, Inter for body copy — loaded from Google
  Fonts in `index.html`.
- **Motion:** cards fade+slide in, drag ghost tilts, orbs slowly drift, presence indicator
  pulses. Everything uses cubic-bezier easing curves.

## Build & dev

```bash
# From workspace root
npm install
npm run dev         # concurrently runs `server` + `client`

# Or just the client
npm run dev --workspace client
npm run build --workspace client
```

Vite proxies `/api` and `/socket.io` to `http://localhost:3001` in development. In
production the compiled server serves `client/dist` from the same origin, so no proxy is
needed.
