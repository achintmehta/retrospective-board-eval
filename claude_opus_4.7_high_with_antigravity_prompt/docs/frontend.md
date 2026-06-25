# Frontend Architecture

The client is a Vite + React 18 single-page app. It talks to the backend through a
thin REST helper (`/api`) for snapshot loads, and through a single Socket.io
connection for all real-time mutations.

## Stack

- **React 18** with React Router 6 for routing.
- **@dnd-kit/core + @dnd-kit/sortable** for drag-and-drop between columns and within
  a column.
- **socket.io-client** for real-time events.
- **Vanilla CSS** with a small token system in `src/styles/index.css`. No CSS-in-JS,
  no Tailwind.

## Routes

| Path           | Component   | Purpose                                       |
| -------------- | ----------- | --------------------------------------------- |
| `/`            | `MainPage`  | Hero, "Create Board" form, list of boards     |
| `/board/:id`   | `BoardPage` | Live board with columns, cards, and comments  |

## Key Files

```
src/
  main.jsx                Router + StrictMode root
  App.jsx                 Shell layout, sticky header
  pages/
    MainPage.jsx          Lists boards, creates new ones
    BoardPage.jsx         Loads a board, wires sockets + drag-and-drop
  components/
    GuestAuthModal.jsx    First-visit display-name prompt
    Column.jsx            Droppable column with sortable card list
    Card.jsx              Draggable card + inline comments drawer
  lib/
    api.js                Tiny fetch wrapper for REST calls
    socket.js             Lazy-singleton socket.io-client instance
    guestSession.js       localStorage helpers + initials utility
  styles/
    index.css             Design tokens, components, animations
```

## State Strategy

The server is the source of truth. The client keeps three flat arrays in
`BoardPage`: `columns`, `cards`, and `comments`. They are derived into
`cardsByColumn` and `commentsByCard` maps with `useMemo`.

- On mount: `GET /api/boards/:id` snapshots the board.
- On `join_board` ack: state is replaced with the server's authoritative snapshot,
  which guards against missed events during reconnects.
- On real-time events: state is patched (insert-or-replace) and re-derived.

Card drag is **optimistic** — `handleDragEnd` reorders the local list immediately,
then emits `move_card`. The server broadcasts `card_moved` with the canonical
position back to all clients, including the sender, which makes the local update
self-correcting.

## Drag-and-Drop

`@dnd-kit` provides:

- `DndContext` at the BoardPage level with `closestCorners` collision detection.
- `useDroppable` on every `Column` — id `col:<columnId>`.
- `useSortable` on every `Card` — id `<cardId>`.

`handleDragEnd` resolves the target column and index by inspecting `over.data.current`:
dropping over a card uses that card's column and its sorted index; dropping over an
empty column appends to the end.

## Realtime Lifecycle

1. `BoardPage` mounts → REST snapshot loads.
2. If no display name in `localStorage`, `GuestAuthModal` is shown. Submitting it
   persists the name and triggers the socket effect.
3. Socket effect: connect (lazy singleton), emit `join_board`, register listeners.
4. On unmount or `id`/`name` change, listeners are removed. The socket itself
   stays connected for reuse on subsequent navigations.

## Styling Notes

`src/styles/index.css` defines a small design system:

- Color tokens (cosmic navy background, violet/cyan/pink accent gradients).
- Typography via Outfit (display) and Inter (body).
- Reusable utility classes: `.btn`, `.btn-primary`, `.btn-secondary`, `.input`,
  `.textarea`, `.banner`, `.loader`.
- Component-scoped class blocks for layouts (`.main-page`, `.board-page`,
  `.column`, `.card`, `.modal`).

Animations are kept short (160–320 ms) and use `cubic-bezier` easings for a
snappy feel. Hover lifts, focus rings, and the animated hero gradient produce
the "premium" first impression without slowing interactions.
