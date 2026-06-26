# Frontend Architecture

The client is a Vite + React 18 single-page app under `client/`. It uses
React Router for navigation, a shared Socket.io singleton for realtime
state, and a single hand-rolled design system (no UI framework, no
Tailwind) in `client/src/styles/index.css`.

```
client/
├── index.html
├── vite.config.js          # dev proxy → backend (HTTP + WebSocket)
├── public/favicon.svg
└── src/
    ├── main.jsx            # React root + Router bootstrap
    ├── App.jsx             # Top-level layout, header, footer, routes
    ├── api.js              # Tiny fetch-based REST client
    ├── socket.js           # Lazy Socket.io singleton
    ├── session.js          # Display-name session storage helpers
    ├── styles/index.css    # Design tokens, layout, components, motion
    ├── pages/
    │   ├── MainPage.jsx    # Hero, create-board form, recent boards grid
    │   └── BoardPage.jsx   # Live board: columns, cards, modals
    └── components/
        ├── NameModal.jsx   # Guest auth: prompts for a display name
        ├── CardModal.jsx   # Card detail + comments composer
        └── Column.jsx      # One column + its draggable cards
```

## Routing

Two top-level routes, plus a 404:

| Path                | Component  | Purpose                                                              |
| ------------------- | ---------- | -------------------------------------------------------------------- |
| `/`                 | `MainPage` | Hero, create-board form, list of existing boards.                    |
| `/board/:boardId`   | `BoardPage`| Live board UI. Requires a display name.                              |
| anything else       | `NotFound` | Friendly empty state with a link back home.                          |

`App.jsx` also tucks an &ldquo;All boards&rdquo; link into the header when on a board
route so the user can always escape back to the index.

## State management

There is no global store — Redux/Zustand would be overkill for a single
board view. Instead:

- **MainPage** uses local `useState`/`useEffect` to fetch and display
  boards, and to drive the create-board form.
- **BoardPage** uses `useReducer` to consolidate all live board state into
  one normalized shape:
  ```js
  {
    board,                    // {id, title, created_at}
    columns: [...],           // sorted by position
    cardsByColumn: { [colId]: [card, ...] },
    commentsByCard: { [cardId]: [comment, ...] },
  }
  ```
  Action types: `HYDRATE`, `COLUMN_ADDED`, `CARD_ADDED`, `CARD_MOVED`,
  `COMMENT_ADDED`, `OPTIMISTIC_MOVE`. Each socket event maps to exactly
  one reducer action, which keeps event handling tiny and testable.
- **Session** lives in `sessionStorage` via `session.js`. The reducer is
  deliberately unaware of identity — display names are passed in as part of
  outgoing socket emits.

### Optimistic UI for drag-and-drop

When the user drops a card, the reducer applies `OPTIMISTIC_MOVE`
immediately so the UI feels instant. The same gesture also emits
`move_card` to the server. When the server&rsquo;s `card_moved` broadcast comes
back, the reducer overwrites positions with the authoritative ordering
(`ordered_cards`) — so if any other concurrent move happened, the local
state self-corrects without flicker.

## Real-time

`socket.js` exposes a single lazy `getSocket()` factory. The board page
calls `connect()` only after the display name is set, then registers
listeners for `column_added`, `card_added`, `card_moved`, `comment_added`,
`error_message`, plus connect/disconnect. On reconnect the page refetches
`/api/boards/:id` to recover from missed events.

Mutations are always emitted through the socket — there is no REST fallback
for adding cards/comments. This keeps the &ldquo;who broadcasts what&rdquo; story
simple.

## Drag-and-drop

We use [`@hello-pangea/dnd`](https://github.com/hello-pangea/dnd) — the
maintained fork of `react-beautiful-dnd`. The board wraps all columns in a
single `DragDropContext`, each column is a `Droppable`, and each card is a
`Draggable`. Drop events are translated into the reducer&rsquo;s
`OPTIMISTIC_MOVE` action plus a server emit.

## Design system

`client/src/styles/index.css` is the single source of styling truth. It
contains:

- **Tokens**: colors, gradients, spacing, radii, motion easings/durations,
  font stack.
- **Layout primitives**: `.app-shell`, `.topbar`, `.page`, `.footer`.
- **Components**: `.btn`, `.input`, `.textarea`, `.glass`, `.panel`,
  `.modal`, board-specific tiles (`.board-tile`, `.column`, `.card`).
- **Motion**: `card-in`, `modal-in`, `pulse`, `shimmer` keyframes; hover
  micro-animations on tiles, buttons, and cards.

The aesthetic is **dark glassmorphism** with curated HSL-tuned gradients
per column type and per board tile. The hero uses a radial multi-gradient
background painted on the `body` so it stays consistent across routes.
Typography is [Outfit](https://fonts.google.com/specimen/Outfit) for UI
text, [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
exposed as `--font-mono` for any future code snippets. Both are pulled
from Google Fonts in `index.html`.

## Accessibility & UX details

- Every interactive element has a unique, descriptive `id` (used both for
  automated browser testing and assistive tools).
- The card tile in a column acts as a button (`role="button"`,
  `tabIndex={0}`, keyboard-activated by Enter/Space).
- Modals listen for `Escape` to close and trap interactions via a darkened
  backdrop.
- Connection status is announced with an `aria-live` region (the toast
  host).
- Color contrast aims for AA on body text against the dark background.

## Build pipeline

Vite handles JSX transform, CSS bundling, and asset hashing. `npm run
build` (root) shells into the client, installs deps, and produces
`client/dist/`. In production the Express server statically serves that
directory and SPA-falls back to `index.html` for any non-API/non-socket
path.
