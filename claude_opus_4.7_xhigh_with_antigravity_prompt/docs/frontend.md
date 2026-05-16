# Frontend Guide

A small but opinionated React + Vite app. No global state library — local
component state plus a `useReducer` for the board view is sufficient given
that all cross-client coordination flows through Socket.io broadcasts.

## Stack

- **React 18** with hooks.
- **React Router 6** for navigation (`/` and `/boards/:id`).
- **Socket.io client** for realtime.
- **@hello-pangea/dnd** for drag-and-drop (the maintained fork of
  `react-beautiful-dnd`).
- **Vanilla CSS**, no Tailwind. Tokens + per-component classes.
- **Outfit** + **JetBrains Mono** via Google Fonts.

## File map

```
client/src/
├── main.jsx                   React + Router bootstrap
├── App.jsx                    Header + routes + ToasterProvider
├── pages/
│   ├── HomePage.jsx           Hero, create-board form, board grid
│   └── BoardPage.jsx          Board view, realtime, DnD, modal, export
├── components/
│   ├── DisplayNameModal.jsx   Guest-auth modal (focus trap, Esc to close)
│   ├── Column.jsx             A single column + add-card form
│   ├── Card.jsx               Draggable card + comment toggle
│   ├── CommentList.jsx        Comment thread + reply form
│   └── Toaster.jsx            Tiny context-based toast system
├── lib/
│   ├── api.js                 fetch() wrappers for REST endpoints
│   ├── socket.js              Singleton Socket.io client + emitWithAck()
│   ├── session.js             sessionStorage-backed display name
│   └── format.js              Time-ago, initials, deterministic avatar gradient
└── styles/
    ├── tokens.css             Color, spacing, radius, motion variables
    ├── global.css             Resets, body background, typography, scrollbars
    └── components.css         All component classes
```

## State model

The Home page is straightforward — a single fetch on mount populates the
board list, and the create-board form navigates on success.

The Board page uses `useReducer` for board state:

| Action            | Effect                                                    |
| ----------------- | --------------------------------------------------------- |
| `load_success`    | Initial board fetched.                                    |
| `card_added`      | Append a card to a column (idempotent on id).             |
| `card_moved`      | Rebuild source + destination columns from `*Order` arrays. |
| `comment_added`   | Append a comment to a card (idempotent on id).            |
| `column_added`    | Append a new column to the board.                         |

Mutations follow the **server-as-truth** pattern:

1. Local action (drag-end / form submit) emits a Socket.io event.
2. The server writes to SQLite and broadcasts the canonical event back.
3. **Every** client (including the originating one) handles the broadcast
   and dispatches the matching reducer action — guaranteeing a single update
   path and no divergence.

The one exception is **card moves**, which apply optimistically via the same
reducer action *before* the broadcast lands. If the server rejects the move,
we refetch the board to re-sync. This keeps drag-and-drop feeling instant
even on slow networks.

## Realtime lifecycle

`BoardPage` handles a small state machine:

1. On mount, fetch the board via REST.
2. If no display name in `sessionStorage`, show the `DisplayNameModal` and
   block joining the room until the user submits one.
3. With a name in hand, get the singleton socket, register listeners
   (`card_added`, `card_moved`, `comment_added`, `presence_*`,
   `connect`/`disconnect`), and emit `join_board`.
4. On `connect` (including reconnects), re-emit `join_board` and **refetch**
   the board so the UI reconciles with whatever happened during the
   disconnect window.

The connection indicator in the toolbar (`Live` ↔ `Reconnecting`) is driven
directly by Socket.io's `connected` flag plus our connect/disconnect
listeners.

## Drag-and-drop

`@hello-pangea/dnd` wraps the columns/cards:

- `DragDropContext` wraps the columns container; `onDragEnd` computes the
  optimistic new orders and fires `move_card`.
- Each column is a `Droppable` with `droppableId === column.id`.
- Each card is a `Draggable` with `draggableId === card.id`.

`onDragEnd` short-circuits if the destination is null or the card was
dropped in the same place.

## Styling system

`tokens.css` defines the design vocabulary as CSS custom properties:

- **Color**: a deep navy backdrop with a violet→cyan→pink ambient
  gradient, glassmorphic surfaces (`backdrop-filter: blur + saturate`), and
  a small palette of column accents.
- **Typography**: Outfit (sans) + JetBrains Mono.
- **Motion**: short eased transitions tuned for hover/focus feedback,
  collapsed under `prefers-reduced-motion`.

`components.css` holds all named component classes (`.card`, `.column`,
`.btn`, `.glass`, `.modal`, `.presence`, `.add-card`, etc.). Components
themselves only emit `className` strings — no styled-components, no CSS-in-JS
runtime.

## Accessibility

- Forms have explicit `<label>` elements bound by `htmlFor`.
- The display-name modal uses `role="dialog"`, `aria-modal`, focus on open,
  Esc to dismiss.
- Toasts live in an `aria-live="polite"` region.
- All interactive elements have stable `id`s (e.g. `add-card-trigger-<columnId>`)
  for browser automation and screen-reader navigation.
- Reduced-motion users get effectively-zero transitions via the global
  `prefers-reduced-motion` media query.

## Adding a feature

A typical addition (e.g., editing a card) would:

1. Add a Socket.io event on the server (`update_card`) that mutates SQLite
   and broadcasts `card_updated`.
2. Add a reducer case here (`card_updated`).
3. Wire a UI affordance (inline edit) that emits `update_card` via
   `emitWithAck` from `lib/socket.js`.
4. Refresh `docs/api.md` with the new event.
