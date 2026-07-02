# Frontend Guide

The client is a Vite + React 18 SPA. There is no state library — component state and a
few tiny stateless helper modules are enough for a real-time-only application where the
server is the source of truth.

## Stack

- **React 18** with the modern createRoot API
- **React Router v6** for `/` and `/boards/:boardId`
- **`@dnd-kit/core`** for accessible drag-and-drop between columns
- **`socket.io-client`** for real-time updates
- **Native `fetch`** for REST calls (no react-query — the state model is simple enough)

## Project layout

```
client/src/
├── main.jsx                 # ReactDOM entry + BrowserRouter
├── App.jsx                  # <Routes> + <TopBar>
├── pages/
│   ├── HomePage.jsx         # Board list + create form
│   ├── BoardPage.jsx        # Main real-time canvas
│   └── NotFoundPage.jsx
├── components/
│   ├── TopBar.jsx           # Sticky header with brand + nav
│   ├── GuestAuthModal.jsx   # Display-name prompt shown before joining a board
│   ├── BoardColumn.jsx      # A single column + card composer + droppable target
│   ├── CardView.jsx         # Draggable card w/ author avatar and comment count
│   ├── CommentDrawer.jsx    # Slide-in drawer for viewing/adding comments
│   ├── PresenceBar.jsx      # "You + N online" indicator
│   ├── AddColumnModal.jsx   # New-column dialog with accent picker
│   └── Toast.jsx            # Ephemeral toast used for peer activity
├── lib/
│   ├── api.js               # REST wrappers
│   ├── socket.js            # Singleton socket.io client
│   ├── identity.js          # localStorage-backed display name + avatar helpers
│   └── format.js            # timeAgo / formatDate
└── styles/global.css        # Design tokens, base styles, animations, atoms
```

## Design system

The whole visual language lives in `styles/global.css`. CSS custom properties define
colors, gradients, shadows, radii, and easing curves. Component styles reference these
tokens so anything can be re-themed by editing the root variables.

Typography is loaded from Google Fonts — **Inter** for body text and **Outfit** for
headings and the wordmark. There is a small set of reusable atoms:

- `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-icon`
- `.input`, `.textarea`
- `.chip` — pill-shaped label
- `.glass` — glassmorphism surface (translucent + blur)
- `.animate-fade-in`, `.animate-pop-in` for one-shot entrance animations
- `.gradient-text` for the accent gradient text treatment

## State model

There are two pieces of persistent state:

1. **`localStorage['retro.displayName']`** — the guest display name.
2. **`board`** — the entire board tree, mirrored from the server, kept in `BoardPage`
   local state.

The `BoardPage` state machine looks like this:

```
route mounts
  → fetch /api/boards/:id → set board
  → if no displayName → render <GuestAuthModal /> and wait
  → once displayName exists → connect socket, join_board, replace board from ack
  → subscribe to card_added / card_moved / comment_added / column_added / presence
  → on each event → immutable update of board state
```

All mutations flow through Socket.io. The board state is the ONE React state tree the
components read from — no local caches, no separate selectors.

### Optimistic UI

Drag-and-drop applies the new position optimistically before waiting for the server ACK
so the interaction feels instant. If the ACK returns `{ ok: false }` we refetch the
board to reconcile. Every other mutation waits for the server broadcast to update
state, which is fast enough on localhost or a LAN to feel immediate.

### Real-time reconciliation

Socket.io reconnects automatically on network blips. On every `connect` event the
frontend re-emits `join_board`, and the ACK returns the full board. That reply is used
to *replace* local state — this is a cheap "give me everything again" reconciliation
that never diverges.

## Drag-and-drop

- Each column is a `useDroppable` with `data: { type: 'column' }`.
- Each card is a `useDraggable` with `data: { type: 'card', columnId }`.
- On drag end we check `over.data.current.type` and compute the target column + index.
- Movement is emitted via `move_card` with `toColumnId` and `toPosition`.
- A `<DragOverlay>` renders the card with a slight rotation while dragging, so it feels
  like a physical object.

Touch support is enabled via `dnd-kit`'s pointer sensor with a small distance
activation threshold (4 px) so short taps don't accidentally initiate drags.

## Presence and toasts

The socket layer emits `presence_update` whenever someone joins or leaves. The count is
shown in the top-right of the board next to the current user's initials avatar. When
another user (not the local user) adds a card, moves one, or comments, a toast pops up
in the bottom-right — muted, ephemeral, and non-blocking.

## Accessibility

- All interactive elements are real `<button>`, `<a>`, or focusable `<input>`.
- The auth modal and add-column modal use `role="dialog" aria-modal="true"` and trap
  focus on their first field.
- `dnd-kit` provides keyboard drag-and-drop by default.
- Color contrast meets WCAG AA against the dark background for both body text and
  interactive controls.

## Building and running

The client is developed against Vite's dev server on port 5173. It proxies `/api` and
`/socket.io` to `http://localhost:3001`.

```bash
npm run dev              # starts both servers (root package.json)
npm --prefix client run build   # produces client/dist for production
```

In production the Express server serves `client/dist` statically and falls back to
`index.html` for any non-API route so that React Router owns the SPA routes.
