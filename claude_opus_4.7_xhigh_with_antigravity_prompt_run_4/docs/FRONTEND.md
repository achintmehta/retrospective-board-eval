# RetroFlow Frontend

The client is a single-page React app built with Vite. It speaks REST for board CRUD and
Socket.io for everything that needs to feel live.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Bundler / dev server | **Vite 5** | Sub-second HMR, sensible defaults |
| UI library | **React 18** | Concurrent rendering, huge ecosystem |
| Routing | **react-router-dom 6** | Tiny, well-known, no SSR overhead |
| Drag & drop | **@hello-pangea/dnd** | Maintained fork of react-beautiful-dnd; the cleanest "move cards between lists" API |
| Realtime | **socket.io-client** | Mirrors the server, gives us free reconnects + acks |
| Styles | **Vanilla CSS** with custom properties | No framework lock-in; design tokens travel with the file |

## File layout

```
client/
├── index.html               # Entry HTML, fonts, theme color
├── vite.config.js           # Dev proxy: /api & /socket.io → http://localhost:3001
└── src/
    ├── main.jsx             # Mounts <App /> inside <BrowserRouter>
    ├── App.jsx              # Top-level shell: header, routes, footer
    ├── api.js               # Tiny fetch wrapper for the REST endpoints
    ├── hooks/
    │   ├── useGuestName.js  # Read/persist the display name in localStorage
    │   └── useBoardSocket.js# Manage the socket lifecycle for one board
    ├── pages/
    │   ├── HomePage.jsx     # List of boards + create-board form
    │   ├── BoardPage.jsx    # Live board: drag-and-drop, comments, export
    │   └── NotFoundPage.jsx
    ├── components/
    │   ├── GuestNameModal.jsx
    │   ├── Column.jsx
    │   ├── Card.jsx
    │   ├── CardDetailModal.jsx
    │   ├── AddColumnButton.jsx
    │   ├── ConnectionStatus.jsx
    │   └── ParticipantsBadge.jsx
    └── styles/
        └── index.css        # Design tokens + all component styles
```

## State management

State is intentionally lightweight — there is no Redux / Zustand / Context store. Each
page owns the state it renders:

- **HomePage** keeps `boards`, `loading`, `error`, and the create-form draft in
  `useState`. It hits `api.listBoards()` once on mount.
- **BoardPage** uses a `useReducer` (`boardReducer`) whose actions are exactly the
  Socket.io broadcast event names: `card_added`, `card_moved`, `comment_added`,
  `column_added`, plus a `set` action for full refetches.

The reducer is the single source of truth for what the board looks like. `useBoardSocket`
takes an `onEvent(type, payload)` callback and dispatches each broadcast into the
reducer. This keeps optimistic local moves, server confirmations, and refetches on a
single update path.

## Routing

| Path | Component |
| --- | --- |
| `/` | `HomePage` |
| `/boards/:boardId` | `BoardPage` |
| `*` | `NotFoundPage` |

## Display-name session

`useGuestName` reads/writes the display name in `localStorage` under
`retro:display-name`. The `BoardPage` renders a blocking `GuestNameModal` whenever the
hook returns an empty name, so the user always has an identity before the socket joins
the room. The same name is used to set the card / comment `author_name` on the server.

## Real-time flow (illustrated)

```
User A drags a card                Reducer (A)             Socket               Reducer (B)
─────────────────────              ────────────             ──────                ────────────
optimistic local move ─────────────► card_moved
       │
       ▼
emit('move_card', …)  ─────────────────────────────► server persists, broadcasts ─► card_moved
                                                                                     (resyncs positions)
```

The same flow applies to `add_card` and `add_comment`, except those don't render
optimistically — the broadcast arrives in single-digit milliseconds in practice.

## Drag-and-drop

`@hello-pangea/dnd` wraps each column in a `<Droppable droppableId={column.id} type="CARD">`
and each card in a `<Draggable draggableId={card.id} index={i}>`. On `onDragEnd`:

1. Build an optimistic `columnOrders` payload by simulating the move on local state.
2. Dispatch `card_moved` to the reducer with the optimistic payload.
3. Emit `move_card` to the server. On error, refetch the board to reconcile.

`isDragDisabled` is true while the user is still on the guest-name modal, so unnamed
users cannot reorder anything.

## Design system

All visual choices live in `src/styles/index.css` as custom properties, grouped by
purpose:

- **Surfaces** (`--bg-0` … `--bg-3`, `--surface*`) — moody dark blue base, semi-transparent
  surfaces for glassmorphism.
- **Brand** (`--brand-1`, `--brand-2`, `--brand-3`, `--brand-gradient`) — purple-to-cyan
  gradient as the hero accent; magenta as the third anchor.
- **Text** (`--text-strong`, `--text-default`, `--text-muted`, `--text-faint`).
- **Feedback** (`--success`, `--warn`, `--danger`).
- **Shadows**, **radii** (`--r-sm`/`md`/`lg`/`xl`), **motion** (`--ease-out`,
  `--ease-spring`, `--t-fast`/`base`/`slow`).
- **Type** — Inter for UI, Sora for display, both loaded from Google Fonts.

Each column on the board is assigned an accent color from a curated rotation
(`COLUMN_ACCENTS` in `BoardPage.jsx`) and applies it through CSS variables (`--col-accent`,
`--col-gradient`) so cards in that column adopt the same hover glow.

### Animations

- `shimmer` — skeleton loading on the home page board cards.
- `pulse` — live indicator on the hero badge and the connection status dot.
- `modalIn` — slight scale + translate on modal entry (spring easing).
- `loaderBounce` — three-dot loader on the board page during initial fetch.

`@media (prefers-reduced-motion: reduce)` shortens all animations to ~0 ms.

## Accessibility notes

- Modals have `role="dialog"`, `aria-modal="true"`, and labelled headings.
- Connection status uses `role="status"` and `aria-live="polite"`.
- Cards are keyboard-focusable (`tabIndex={0}`, `role="button"`) and open on Enter / Space.
- All interactive elements have descriptive `id`s — useful for browser automation.

## Adding a feature

1. **API** — add a route in `src/routes/boards.js` or a handler in `src/sockets.js`.
2. **State** — add an action to `boardReducer` (and a `type`-mapped event if it should
   sync over Socket.io).
3. **UI** — add or update a component under `client/src/components` and consume the
   reducer state from `BoardPage`.

Keep components stateless where possible; let `BoardPage` orchestrate.
