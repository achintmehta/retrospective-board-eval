# Frontend Architecture

The frontend is a single-page React app built with Vite and React Router. It
is intentionally small — no global state library, no UI kit, just React hooks
plus a hand-rolled design system in CSS.

## Stack

| Concern         | Choice                                            |
| --------------- | ------------------------------------------------- |
| Bundler/dev     | Vite 5                                            |
| UI              | React 18                                          |
| Routing         | React Router 6 (`BrowserRouter`)                  |
| Drag-and-drop   | `@dnd-kit/core` + `@dnd-kit/sortable`             |
| Real-time       | `socket.io-client` (`/socket.io` namespace)       |
| Styling         | Vanilla CSS with custom tokens (`src/index.css`)  |
| Fonts           | Google Fonts — Outfit (display), JetBrains Mono   |

## Directory layout

```
client/src/
├── main.jsx              # Router bootstrap
├── App.jsx               # Layout shell (header + outlet)
├── App.css
├── index.css             # Design system: tokens, primitives, utilities
├── pages/
│   ├── HomePage.jsx      # Board list + create form + hero
│   ├── BoardPage.jsx     # The retro board itself (DnD, socket, drawer)
│   ├── NotFoundPage.jsx
│   ├── HomePage.css
│   └── BoardPage.css
├── components/
│   ├── Column.jsx        # Single column with drop area + add-card form
│   ├── Card.jsx          # Sortable card item
│   ├── CardDrawer.jsx    # Side drawer for card details + comments
│   └── GuestAuthModal.jsx
├── hooks/
│   ├── useBoardSocket.js # Socket.io lifecycle + presence
│   └── useToast.js
├── state/
│   └── boardReducer.js   # Pure reducer for board snapshot updates
└── lib/
    ├── api.js            # Typed fetch wrappers
    ├── session.js        # Display name persistence + avatar helpers
    └── format.js         # Date formatting
```

## Design system

`src/index.css` defines:

- **Color tokens** — `--bg-*`, `--text-*`, `--accent-*`, `--grad-*`. Dark theme
  by default with aurora gradient accents.
- **Spacing + radius scales** — `--space-{1..8}`, `--radius-{xs..xl}`.
- **Motion** — `--duration-*`, `--ease-spring`, `--ease-smooth`.
- **Primitives** — `.glass`, `.btn`, `.btn-primary`, `.btn-secondary`,
  `.btn-ghost`, `.input`, `.textarea`, `.label`, `.badge`, `.kbd`, `.toast`,
  `.skeleton`, `.empty-state`.

Component CSS files only contain layout and component-specific styling;
everything visual leans on the tokens above.

## Pages

### `HomePage`

- Hero with animated gradient headline, floating example cards.
- Pill-shaped input + button to create a board; suggestion chips populate the
  input.
- Grid of existing boards as glass cards. Loads from `GET /api/boards`.
- Empty + loading states use `.empty-state` and `.skeleton` primitives.

### `BoardPage`

The orchestrator. Responsibilities:

1. **Initial load**: `GET /api/boards/:id` → `boardReducer` `set` action.
2. **Guest auth**: if no display name in `localStorage`, show `GuestAuthModal`
   and persist via `lib/session.js`.
3. **Socket lifecycle**: `useBoardSocket` connects, joins, listens for
   `card_added` / `card_moved` / `comment_added` / `column_added` / `presence`
   events. Each event maps 1:1 to a reducer action.
4. **Drag and drop**: `dnd-kit` `DndContext` wraps the columns. On
   `onDragEnd`, the page does an optimistic local reorder then emits
   `move_card`. If the ack is `{ ok: false }` we refetch the board snapshot.
5. **Add card / column**: emit `add_card` over socket; column creation goes via
   REST then a best-effort `column_created` socket event so peers refresh
   without polling.
6. **Card drawer**: opening a card slides in `CardDrawer` for details and
   comments. Submitting a comment emits `add_comment`.
7. **Export**: opens `/api/boards/:id/export` in a new tab; the browser
   downloads the CSV.
8. **Share**: copies the current URL to the clipboard.

### `NotFoundPage`

Simple 404 surface for unknown routes (board not found redirects here).

## State model

`state/boardReducer.js` is a pure function over an immutable board snapshot.
Actions:

- `set` — replace entire snapshot
- `card_added` — append to a column (de-duped by id)
- `card_moved` — remove from source column, insert into target at `toIndex`
- `comment_added` — append to a card (de-duped)
- `column_added` — append column and sort by `position`

The reducer is **idempotent** for each action, so receiving the same broadcast
twice never duplicates data — important because Socket.io reconnects can
re-deliver the most recent buffered events.

## Realtime hook (`useBoardSocket`)

Encapsulates:

- Connection (`io()` defaults to same-origin; Vite proxies `/socket.io` to the
  Express server in dev).
- Auto `join_board` on every connect/reconnect.
- `connected` / `connecting` / `disconnected` / `error` status surface for the
  presence pill in the board header.
- `presence` count broadcast by the server whenever a socket joins or leaves.
- A typed `emit(event, payload)` helper returning a Promise that resolves with
  the ack — so callers can `await` the server confirmation.

## Visual details to keep an eye on

- Floating cards on the hero use a `floaty` keyframe and per-card delays so
  they breathe out of phase.
- The header uses `backdrop-filter` for the frosted-glass effect; the body
  background is a static aurora gradient with a faint grid overlay masked to
  the center.
- The board page is bound to viewport height (`100vh - header`) and the
  columns container scrolls horizontally with snap points — feels native on
  trackpads and touch.
- The card drawer slides via `transform: translateX` with a spring easing so
  it feels rubbery, not linear.

## Accessibility notes

- All interactive elements have visible focus rings (`:focus-visible`).
- The modal traps focus on its input via `autoFocus` and `useEffect` and
  supports `Escape` to close (via parent state).
- The drag-and-drop layer uses `dnd-kit`'s `KeyboardSensor` so cards can be
  reordered by keyboard.
- Heading hierarchy: each page has a single `<h1>`, columns use `<h2>`, the
  drawer uses `<h3>` for the comments section.
- Avatar circles include `title` attributes; presence pill exposes status via
  `title`.

## Tweaking the design

- Change palette: edit `--accent-*` and `--grad-*` in `index.css`.
- Change layout density: tweak `--space-*`.
- Change motion feel: tweak `--ease-*` and `--duration-*`.
- The board columns are 320px wide (`.column` rule in `BoardPage.css`); change
  there if you need narrower or wider columns.
