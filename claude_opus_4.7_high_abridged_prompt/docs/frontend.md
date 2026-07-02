# Frontend Architecture

The client is a Vite + React + TypeScript SPA. It talks to the backend over
plain `fetch` (REST) and `socket.io-client` (realtime).

## Stack

- **React 18** (strict mode)
- **React Router v6** for navigation
- **Vite** dev server (proxies `/api` and `/socket.io` to `:4000`)
- **@hello-pangea/dnd** for drag-and-drop between columns
- **socket.io-client** for realtime updates
- **Outfit** (Google Fonts) as the primary typeface

## Directory layout

```
client/src/
├── main.tsx              # ReactDOM entry + router setup
├── App.tsx               # shell (header, background)
├── index.css             # design tokens + component styles
├── api.ts                # REST helpers
├── socket.ts             # socket.io-client singleton
├── types.ts              # shared TS interfaces
├── pages/
│   ├── HomePage.tsx      # list & create boards
│   └── BoardPage.tsx     # board with columns, cards, comments, DnD
└── components/
    ├── NameModal.tsx     # guest display-name prompt
    └── CommentsDrawer.tsx# per-card comment thread
```

## Routing

| Path            | Component |
|-----------------|-----------|
| `/`             | `HomePage` |
| `/boards/:id`   | `BoardPage` |

Both routes render inside `<App />`, which provides the sticky header, gradient
background, and a global "back to boards" link.

## Realtime lifecycle (BoardPage)

1. On mount, fetch the full board with `GET /api/boards/:id`.
2. If no display name is set in `sessionStorage`, render `NameModal` and block
   interaction until the user commits a name.
3. Once a name exists, open a socket (module-level singleton) and emit
   `join_board` with `{ boardId, name }`.
4. Subscribe to `card_added`, `card_moved`, `comment_added`, `column_added` and
   merge them into local state (dedup by id).
5. On disconnect, show a "Reconnecting" chip. On reconnect, re-emit `join_board`
   and refetch the board to avoid any drift.

Local mutations (add card, move card, add comment) go through the socket. UI
updates optimistically; a follow-up refetch after `card_moved` reconciles
position bookkeeping with the server.

## Drag-and-drop

Each column is a `Droppable`; each card is a `Draggable`. `onDragEnd` performs
an optimistic in-memory rearrangement and emits `move_card` with the target
`columnId` and `toPosition`. The server computes the final positions and
broadcasts `card_moved` to every connected client (including the initiator).

## Comments

Clicking a card's comment count opens `CommentsDrawer` — a slide-in panel that
displays the ordered comment thread and provides a text area. Enter submits;
Shift+Enter inserts a newline; Escape closes.

## Guest session

The display name lives in `sessionStorage` under `retro:displayName`. It is
scoped per browser tab and is cleared on tab close. A "change name" link in the
board subtitle clears it and re-opens the modal.

## Design system (see `index.css`)

- **Dark theme** with layered radial gradients and a subtle grid backdrop
- **Outfit** for UI, **JetBrains Mono** available for monospace surfaces
- Reusable primitives: `.btn`, `.btn-primary`, `.input`, `.textarea`,
  `.card-panel`, `.column`, `.card`, `.modal`
- Micro-animations: card fade-in, modal slide-up, presence-dot pulse,
  hover-lift on cards & board items
- Curated palette centered on violet/fuchsia gradients with cyan and emerald
  accents

## Extending

- **New realtime event** — add a handler in `server/sockets.js`, mirror it in
  `BoardPage.tsx`'s effect (`socket.on(...)` + state update).
- **New column swatch** — extend the `.column:nth-child(6n + N)` block in
  `index.css`.
- **New page/route** — add a route in `main.tsx` and a component in
  `pages/`.
