# Frontend Architecture

A small, dependency-light React app written in Vite. The UI is built on
plain CSS variables and a tight design system rather than a utility framework,
so the visual identity is owned in one place (`client/src/index.css`).

## Stack

- **React 18** + **react-router-dom** for routing
- **Vite** as the dev server and bundler
- **socket.io-client** for the real-time channel
- **@dnd-kit/core** + **@dnd-kit/sortable** for drag-and-drop

No Tailwind, no UI library, no global state container — local state plus
Socket.io events is all the app needs.

## Routes

| Path             | Component        | Purpose                                |
| ---------------- | ---------------- | -------------------------------------- |
| `/`              | `HomePage`       | List + create boards                   |
| `/boards/:id`    | `BoardPage`      | Live, multi-user retrospective board   |
| `*` (fallback)   | redirect to `/`  |                                        |

## Folder layout

```
client/src/
├── App.jsx                 # Router + ToastProvider
├── main.jsx                # React entry point
├── index.css               # Design system + components styles
├── pages/
│   ├── HomePage.jsx        # Boards list + create form
│   └── BoardPage.jsx       # The collaborative board
├── components/
│   ├── Topbar.jsx          # Brand, live indicator, identity chip
│   ├── GuestAuthModal.jsx  # Display-name capture
│   ├── Column.jsx          # Single column + add-card composer
│   ├── CardItem.jsx        # Card tile (sortable)
│   ├── CardDetailModal.jsx # Card detail + comments
│   └── Toasts.jsx          # Toast context + UI
└── lib/
    ├── api.js              # REST helpers
    ├── socket.js           # Socket.io singleton + emit-with-ack
    └── identity.js         # Display name persistence + avatar helpers
```

## State model on the Board page

```
BoardPage state
├── displayName         string         # from localStorage / GuestAuthModal
├── board               { id, title, created_at, columns }
├── cards               Card[]         # flat list, sorted by position
├── comments            Comment[]      # flat list
├── activeCardId        string | null  # opens CardDetailModal
└── draggingId          string | null  # for DragOverlay
```

Derived views (memoised):

- `cardsByColumn` — `Map<columnId, Card[]>`
- `commentsByCard` — `Map<cardId, Comment[]>`
- `commentCountByCard` — fast lookup for badge

This shape keeps reconciliation cheap: incoming socket events touch the
top-level arrays; everything else is recomputed only when those change.

## Realtime flow

1. The Board page fetches the full board via `GET /api/boards/:id`.
2. The user enters a display name in `GuestAuthModal`; it's persisted in
   `localStorage` so they aren't asked again on return.
3. The page connects to Socket.io (singleton) and emits `join_board`. The
   server replies with an authoritative snapshot, which we use to overwrite
   the locally fetched state — this also handles the reconnect case.
4. Outgoing actions (`add_card`, `move_card`, `add_comment`) are sent
   through `emitWithAck`, which surfaces server errors via the toast system.
5. Incoming broadcasts (`card_added`, `card_moved`, `comment_added`,
   `column_added`) merge into the corresponding arrays. Identity is keyed by
   `id` so duplicate events (e.g. local optimistic update plus server
   broadcast) are idempotent.

## Drag-and-drop strategy

- **Sensors**: pointer (4px activation distance) and keyboard (with
  `sortableKeyboardCoordinates`).
- **Layout**: each column has a `useDroppable` and a `SortableContext` so
  cards can be reordered within a column and dropped on empty columns.
- **`onDragOver` (cross-column only)** updates the local state so the card
  visually appears in the new column mid-drag.
- **`onDragEnd`** applies the final reorder, then emits `move_card` to the
  server. If the server rejects the move, the page refetches to recover.
- The dragged card is rendered into `DragOverlay` for a tilt + glow effect
  decoupled from the column's scroll container.

The `applyMove(cards, activeId, toColumnId, overCardId)` helper is shared
between `onDragOver` and `onDragEnd` so the same reordering math runs in
both passes — there's exactly one place to look when fixing drop logic.

## Design system

`client/src/index.css` is the single source of visual truth. It defines:

- HSL tokens for surfaces, text, borders, and accents.
- Three named gradients (`--grad-primary/warm/cool`) plus a per-column
  accent rotation in `lib/identity.js#columnAccent`.
- Component styles (`.btn`, `.input`, `.column`, `.card-item`, `.modal-*`,
  `.toast`, `.live-indicator`).
- An animated aurora background and a faint grid overlay, scoped via
  `body::before` / `body::after`.
- Motion tokens (`--ease`, `--dur-fast/med/slow`) applied uniformly to
  hover, drag, and modal animations.

Typography is **Inter** (sans) and **JetBrains Mono** (numeric + meta),
loaded from Google Fonts in `index.html`.

## Accessibility & SEO

- Single `<h1>` per page and semantic landmarks (`<header>`, `<main>`,
  `<section>`, `<article>`).
- All actionable cards / tiles have descriptive IDs (e.g.
  `add-card-<columnId>`, `card-<cardId>`, `submit-comment-button`) for
  reliable browser-test selectors.
- Keyboard support: Enter / Space to open a card, Esc to close the modal,
  ⌘/Ctrl+Enter to submit comments and cards.
- The `<title>`, `description`, and theme-color meta tags are set in
  `index.html`.

## Customising the look

- Edit the HSL tokens at the top of `index.css` to shift the palette.
- Add a new column-accent gradient in `lib/identity.js#COLUMN_ACCENTS`.
- The brand mark (top-left "R" tile) is pure CSS — swap it for an SVG by
  editing `components/Topbar.jsx`.
