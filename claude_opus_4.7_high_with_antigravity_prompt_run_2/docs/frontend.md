# Frontend architecture

The client is a Vite + React 18 single-page app that talks to the backend
over both REST (for board CRUD) and Socket.io (for live collaboration).

## Stack

| Concern              | Choice                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| Bundler / dev server | [Vite](https://vitejs.dev) with `@vitejs/plugin-react`                 |
| UI library           | React 18 (function components + hooks)                                 |
| Routing              | `react-router-dom` v6                                                  |
| Real-time            | `socket.io-client`                                                     |
| Drag & drop          | `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)           |
| Styling              | Vanilla CSS with a token-based design system in `src/index.css`        |
| Typography           | Google Fonts — *Outfit* (sans) and *JetBrains Mono*                    |
| Persistence (client) | `sessionStorage` for the guest display name (per-tab)                  |

## Directory layout

```
client/
├── index.html
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                 React root + BrowserRouter
    ├── App.jsx                  Topbar + <Routes>
    ├── index.css                Design tokens, base, all component styles
    ├── api.js                   Fetch wrapper around /api
    ├── socket.js                Lazy singleton socket.io-client
    ├── useDisplayName.js        Hook + initials() helper
    ├── pages/
    │   ├── MainPage.jsx         Create board + list boards
    │   └── BoardPage.jsx        Live board view (the brain)
    └── components/
        ├── GuestAuthModal.jsx   Display-name prompt
        ├── Column.jsx           Droppable column + add-card form
        └── Card.jsx             Draggable card + comments
```

## Routes

| Path                  | Component   | Notes                                              |
| --------------------- | ----------- | -------------------------------------------------- |
| `/`                   | `MainPage`  | Lists boards, lets you create a new one.           |
| `/boards/:boardId`    | `BoardPage` | Full live board. Shows guest modal if no name yet. |
| any other             | 404 fallback| Friendly empty-state with a link home.             |

The Vite dev server proxies `/api` and `/socket.io` to the Express server
(`http://localhost:4000`) so the React app and the backend share an
origin during development.

## Data flow

### MainPage

1. On mount, `api.listBoards()` fetches the list.
2. `Create board` form posts to `/api/boards`; on success, the user is
   navigated to `/boards/<id>` (which triggers BoardPage to load that
   board).

### BoardPage

`BoardPage` is the only stateful screen. Its lifecycle:

1. **Fetch:** `api.getBoard(boardId)` returns the full nested board (columns →
   cards → comments). The result is stored in the `board` React state.
2. **Guest auth gate:** if `useDisplayName()` returns an empty string, the
   `GuestAuthModal` is rendered and the rest of the UI is suppressed until
   a name is submitted.
3. **Socket connection:** a singleton Socket.io client is obtained via
   `getSocket()`. On `connect`, the page emits `join_board`. The component
   subscribes to:
   - `card_added` → append the card to its column (sorted by `position`).
   - `card_moved` → remove the card from its current column and splice it
     into the destination at the broadcast index.
   - `comment_added` → append the comment under its parent card.
   - `presence_update` → update the peer count badge.
   - `peer_joined` → flash a toast that someone joined.
   - `connect` / `disconnect` → drive the live indicator dot.
4. **Drag and drop:** `<DragDropContext onDragEnd>` applies an optimistic
   local move (so the UI snaps instantly) and emits `move_card`. The
   server's subsequent `card_moved` broadcast is idempotent — if the card
   is already where it should be, no visible change occurs.
5. **Adding cards / comments:** each mutation emits the corresponding
   Socket.io event with `authorName: displayName`. The card / comment only
   appears in the UI when the server broadcasts back, which keeps every
   tab in sync (including the one that initiated the change).
6. **Adding columns:** uses the REST endpoint (`POST /api/boards/:id/columns`)
   for simplicity and updates local state on success.
7. **Cleanup:** on unmount, the component emits `leave_board` and detaches
   every listener it added.

## Display name (guest session)

`useDisplayName()` reads/writes `sessionStorage` under the key
`retro.displayName`. Using session storage (not local storage) means:

- A new tab on the same board is a separate "guest".
- Closing the tab forgets the name.
- The user is never tracked across boards or origins.

## Design system

`src/index.css` exposes a small set of design tokens at `:root` — colors,
gradients, radii, spacing, typography, shadows, and motion. Component
styles use these tokens (e.g. `--grad-brand`, `--c-surface`, `--r-md`)
so the visual language stays consistent.

Highlights:

- **Background:** layered radial gradients (violet, cyan, pink) over a
  near-black base — set on `body` with `background-attachment: fixed`.
- **Glassmorphism:** `.glass` adds a `backdrop-filter: blur` + a soft
  white surface. Used by tiles, modals, and columns.
- **Hover micro-animations:** board tiles lift, the arrow chip rotates
  and switches to the brand gradient on hover.
- **Drag feedback:** the dragged card tilts slightly and gets a violet
  ring; the destination column highlights with a soft brand tint
  (`.cards.drop-over`).
- **Presence dot:** uses an infinite `box-shadow` pulse keyframe.
- **Typography:** *Outfit* with tight letter-spacing and gradient text on
  hero/board titles; *JetBrains Mono* for IDs and keyboard hints.

## Accessibility

- Modal carries `role="dialog"` and `aria-modal="true"`.
- Every column is a `<section>` with an `aria-label`.
- Icon-only buttons have `aria-label`s.
- All interactive controls have visible `:focus-visible` outlines via the
  `.btn:focus-visible` style.
- The guest auth field has a real `<label htmlFor>`.

## Extending the UI

- **More columns / templates:** templates can be added by changing
  `DEFAULT_COLUMNS` in `server/store.js` or by exposing a column-create
  flow on the Main Page.
- **Card editing / deletion:** the data layer already cascades on delete;
  add REST endpoints and emit `card_updated` / `card_removed` events,
  then handle them in `BoardPage` the same way `card_added` is handled.
- **Reactions / voting:** introduce a `reactions` table keyed by card,
  emit a `reaction_toggled` event, and render an aggregate count on the
  card meta row.
