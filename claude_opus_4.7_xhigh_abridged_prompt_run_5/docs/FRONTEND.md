# Frontend Guide

The client is a Vite + React + TypeScript app living entirely in `client/`. It builds to
`client/dist` and is served statically by the Node backend in production.

## Layout

```
client/
├── index.html                 # HTML shell; loads Google Fonts (Inter + Outfit)
├── vite.config.ts             # Dev proxy for /api and /socket.io -> :4000
├── tsconfig.json
├── public/
│   └── favicon.svg            # Gradient mark used in the browser tab
└── src/
    ├── main.tsx               # React root + <BrowserRouter> setup
    ├── styles.css             # Full design system (see below)
    ├── types.ts               # Shared Board/Column/Card/Comment types
    ├── api.ts                 # Thin fetch wrapper for REST endpoints
    ├── socket.ts              # Singleton socket.io-client instance
    ├── session.ts             # localStorage-backed guest display name
    ├── components/
    │   ├── Nav.tsx            # Top nav with brand mark + presence chips
    │   ├── Modal.tsx          # Reusable overlay + Esc-to-close
    │   ├── Avatar.tsx         # Deterministic gradient avatar from name hash
    │   ├── GuestAuthModal.tsx # Non-closable "pick a display name" modal
    │   ├── ColumnView.tsx     # Column droppable + add-card form
    │   └── CardView.tsx       # Sortable card + comment thread + overlay preview
    └── pages/
        ├── HomePage.tsx       # Board list + hero + create-board form
        └── BoardPage.tsx      # The realtime board (owns all socket wiring + DnD)
```

## Data flow

1. **HomePage** calls `api.listBoards()` on mount and displays results in a grid.
2. Creating a board `POST`s to `/api/boards` and navigates to `/boards/:id`.
3. **BoardPage** calls `api.getBoard(id)` for initial state, then wires the singleton socket:
   - On `connect`, it emits `join_board` and refetches the board (to reconcile after
     reconnects).
   - It subscribes to `card_added`, `card_moved`, `comment_added`, `column_added` and merges
     each event into local state via `setBoard(prev => …)`.
   - On unmount it emits `leave_board` and removes all listeners.
4. User actions never mutate SQLite directly from the client — they emit Socket.io events,
   and the state updates come back via the broadcast. This keeps every connected client in
   lockstep.

## Drag and drop

Powered by `@dnd-kit`:

- Each `ColumnView` is a `useDroppable` target.
- Each `CardView` is a `useSortable` item wrapped in a `SortableContext`.
- A single `DndContext` on the board page orchestrates start/over/end.
- On `onDragOver` we record the current column so it can be highlighted.
- On `onDragEnd` we optimistically reorder within the same column, then emit `move_card`
  with `targetColumnId` + `targetPosition`. The server’s broadcast is idempotent — if it
  echoes a `card_moved` for a card we already placed, the reducer skips duplicates.
- A `DragOverlay` renders a rotated card preview under the cursor for a polished feel.

## Guest auth

`session.ts` stores the display name in `localStorage`. If missing when hitting a board URL,
`GuestAuthModal` is shown non-closable until the user submits a name. The name is stamped
onto every `add_card` / `add_comment` event; the server persists it as the row's
`author_name`.

## Design system (`styles.css`)

- **Palette**: deep near-black backgrounds (`--bg-0` → `--bg-3`), a radial gradient hero
  overlay (purple → cyan → pink) as the page backdrop, and layered white-alpha surfaces for
  cards.
- **Gradients**:
  - `--grad-primary`: violet → cyan (buttons, brand mark, avatars).
  - `--grad-warm`: pink → amber (secondary emphasis).
  - `--grad-cool`: cyan → mint (tertiary emphasis).
  - `--grad-hero`: layered radial background for the whole app.
- **Typography**: `Outfit` for display headings (hero, board title, column titles), `Inter`
  for body and UI.
- **Motion**: 120–380ms `cubic-bezier(.2,.7,.2,1)` easing across hover/focus, subtle
  `card-in` animation on new cards, animated presence dot, drag overlay rotation.
- **Focus rings**: 4px cyan-violet halo (`--accent` @ 14% opacity) around focused inputs and
  the create-board form.
- **Responsive**: horizontally scrolling columns with scroll-snap; nav and paddings shrink
  below 640px.

## Environment

The dev proxy in `vite.config.ts` forwards `/api` and `/socket.io` (including WS upgrade) to
`http://localhost:4000`, so the same relative URLs work in dev and production.

## Extending the UI

- **A new realtime event** — subscribe in `BoardPage`'s effect, update state in a
  duplicate-safe reducer, add an emit call in the appropriate handler.
- **A new page** — add a route in `main.tsx`, drop a file in `pages/`, and share nav via
  `<Nav />`.
- **A new visual accent** — extend the CSS custom properties in `:root`; try to lean on the
  existing gradients before introducing new ones.
