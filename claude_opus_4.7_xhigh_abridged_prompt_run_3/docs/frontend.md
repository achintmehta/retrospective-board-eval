# Frontend Guide

## Overview

- **Vite + React 18** with `react-router-dom` for two routes (`/` and `/boards/:boardId`).
- **`@hello-pangea/dnd`** for drag-and-drop (a maintained fork of `react-beautiful-dnd`).
- **`socket.io-client`** for realtime — a single shared socket lives behind `src/socket.js`.
- **`framer-motion`** for page transitions, modal choreography, and list entry animations.
- **Design tokens + custom CSS** — no UI framework. All styling lives in `src/styles/index.css`, keyed on CSS custom properties (see the `:root { --… }` block at the top of the file).

## Directory layout

```
client/src/
├── main.jsx                # ReactDOM entry, StrictMode + BrowserRouter
├── App.jsx                 # Layout shell: aurora background, header, animated routes
├── api.js                  # REST helpers (fetch wrappers) + export URL
├── socket.js               # Singleton Socket.io client + ack helper (emitAck)
├── hooks/
│   ├── useDisplayName.js   # sessionStorage-backed guest name
│   └── useBoardSocket.js   # Join board, listen to broadcasts, expose actions
├── pages/
│   ├── MainPage.jsx        # Hero + create form + boards list
│   └── BoardPage.jsx       # Guest auth gate → toolbar + drag/drop columns + modal
├── components/
│   ├── Logo.jsx
│   ├── CreateBoardForm.jsx # Title + column list editor
│   ├── BoardListItem.jsx
│   ├── GuestAuthModal.jsx  # First-visit display name prompt
│   ├── Column.jsx          # Droppable list of cards + inline add card form
│   ├── Card.jsx            # Draggable card summary + author + comment count
│   ├── AddCardForm.jsx     # Expand-on-click stub → textarea
│   ├── AddColumnForm.jsx   # Inline column creator
│   └── CardModal.jsx       # Card detail + comments feed + reply form
└── styles/index.css        # Global stylesheet (tokens, layout, components)
```

## Data flow

```
+---------------+   REST (initial load, mutations that don't need broadcast)
| MainPage      |──────────────► GET /api/boards, POST /api/boards
+---------------+
        │
        ▼ react-router
+---------------------+   REST (create column) + Socket.io (everything else)
| BoardPage           |
| ├── useDisplayName  |   session storage
| └── useBoardSocket  |   ← join_board → snapshot → subscribe to broadcasts
|                     |   → add_card / move_card / add_comment (with acks)
+---------------------+
```

`useBoardSocket` owns a `useReducer` state:

- `boardReducer` merges realtime events into the tree returned by `join_board`.
- Reducers are defensive against duplicates (checking `id` before pushing).
- On `card_moved`, positions come pre-ordered from the server (`sourceCards`, `targetCards`), so the reducer just replaces the two affected columns.

The hook exposes:

| Function       | Behavior                                                             |
| -------------- | -------------------------------------------------------------------- |
| `addCard`      | `emit('add_card', …)` with a 5s ack timeout                          |
| `moveCard`     | `emit('move_card', …)`; called from `onDragEnd`                      |
| `addComment`   | `emit('add_comment', …)`                                             |
| `addColumnLocal` | Applied optimistically after the REST call for column creation     |

Columns are created via REST (they don't need cross-tab realtime for MVP), then merged into the local state. Cards and comments always flow through sockets so all clients converge.

## Guest auth

- `useDisplayName` reads from `sessionStorage['retro.displayName']`.
- `BoardPage` renders `GuestAuthModal` when no name is stored yet.
- The name is sent with `join_board` and stored on the socket handle server-side; every subsequent `add_card` / `add_comment` uses it if the payload doesn't specify an author.

## Realtime lifecycle

`useBoardSocket` (effect keyed on `boardId + displayName`):

1. Grabs the shared socket (auto-connecting on first use).
2. Registers listeners for `card_added`, `card_moved`, `comment_added`, `column_added`, `presence_updated`.
3. Emits `join_board` and dispatches the returned snapshot into the reducer.
4. Cleanup emits `leave_board` and removes listeners.

Reconnects are handled by Socket.io automatically. On `connect`, the effect re-runs its `join_board` so the client picks up any missed state (per the design's "refetch on reconnect" mitigation).

## Design system

Design tokens are declared in `:root` at the top of `styles/index.css`. Key ideas:

- **Dark, deep-space palette**: `--bg-0..3` cascade from near-black to violet.
- **Brand gradient** (`--gradient-brand`): violet → cyan, used for the logo, primary CTAs, avatars, and gradient text.
- **Aurora background**: three blurred radial gradients (`--accent-a/b/c`) drift under a fine grid — created purely in CSS, animated with `@keyframes float`.
- **Typography**: `Inter` for UI, `Outfit` for display. Both loaded from Google Fonts in `index.html`.
- **Surface treatment**: cards + panels use a translucent surface (`--surface`) with a `backdrop-filter` blur and a subtle gradient border rendered via the `::before` pseudo mask trick.
- **Motion**: `framer-motion` for entering/exiting elements (route transitions, modals, list items). Interactive states rely on plain CSS transitions to stay lightweight.

### Buttons

`.btn` is a base class; variants stack (`.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--sm`, `.btn--lg`, `.btn--icon`). The primary variant carries the brand gradient plus a violet drop shadow.

### Cards + columns

Cards use a subtle inner gradient plus a saturated shadow only on hover / drag. The dragging state applies a tiny 1.5° rotation for tactile feedback. Column bodies switch to a violet drop zone tint when hovered by a dragged card.

## Extending the UI

If you want to add a new realtime event:

1. Add a socket handler in `server/realtime.js`.
2. Add a listener + reducer case in `useBoardSocket.js`.
3. Wire a callback on the hook return value and expose it to whatever component needs it.

If you want to add a new REST endpoint:

1. Add a repository function in `server/repository.js` (use prepared statements + a transaction for multi-step writes).
2. Wire it up in `server/routes.js`.
3. Add a helper to `client/src/api.js`.

## Build

```bash
npm --prefix client run build      # emits client/dist/
```

The Express server auto-detects `client/dist/index.html` and serves it as a SPA fallback (any non-`/api/*`, non-`/socket.io/*` path returns `index.html`).
