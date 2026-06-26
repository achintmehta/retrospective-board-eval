# Frontend Architecture

React 18 + Vite. No state library — local `useState` / `useEffect` is enough
for a board of this size, and broadcasts come in via a single Socket.io
listener that mutates the `board` tree.

## Routing

`react-router-dom` v6, two routes:

| Path                  | Component  | Purpose                                |
| --------------------- | ---------- | -------------------------------------- |
| `/`                   | `MainPage` | List boards + create a new one         |
| `/boards/:boardId`    | `BoardPage`| The collaborative board                |

## Files

```
client/src/
├── main.jsx                 React entry, wraps <BrowserRouter>
├── App.jsx                  shell + <Routes>
├── api.js                   tiny fetch wrapper for REST
├── socket.js                singleton socket.io-client
├── styles.css               design tokens + component CSS
├── pages/
│   ├── MainPage.jsx         board list + create-board form
│   └── BoardPage.jsx        the realtime board (state + socket wiring)
└── components/
    ├── GuestModal.jsx       display-name prompt (only shown if name absent)
    ├── Column.jsx           one column + drop target
    ├── Card.jsx             draggable card
    ├── AddCardForm.jsx      inline card composer
    ├── AddColumnForm.jsx    inline column composer
    └── CommentsModal.jsx    comment thread for a card
```

## Data flow

1. **Initial load.** `BoardPage` calls `GET /api/boards/:id` and stores the
   result in local state as `board = { …, columns: [{ …, cards: [{ …, comments }]}] }`.
2. **Join.** Once the user has entered a display name (stored under
   `localStorage["retroboard.displayName"]`), the page emits `join_board`.
3. **Realtime updates.** The page subscribes to four events
   (`card_added`, `card_moved`, `comment_added`, plus presence). Each handler
   produces a new immutable `board` via a structural update.
4. **Outgoing intents.** UI actions (`addCard`, `addComment`, drop-end) emit
   socket events. The page does **not** apply optimistic updates — it waits
   for the broadcast to come back, which keeps every connected client in sync
   off a single source of truth.
5. **Reconnect.** On every `connect` (including reconnects) the page refetches
   the board, so any events missed while offline are reconciled.

## Drag-and-drop

Native HTML5 drag-and-drop — no extra dependencies.

- `Card` is `draggable`; on `dragstart` it stores the dragged card on a
  `ref` and sets a `dragging` flag in state for the ghost styling.
- `Column` listens for `dragover` and computes the would-be drop index from
  the cursor's Y position relative to the children.
- On `drop`, the column calls `onCardDrop(columnId, index)`. `BoardPage`
  adjusts the index when the card moves *within* the same column past its
  original slot, then emits `move_card`.

## Styling

Vanilla CSS in `styles.css`, organized into:

- **Design tokens** (`:root` custom properties) — colors, radii, easing,
  shadows.
- **App shell + page layouts.**
- **Components** (`.column`, `.card`, `.modal`, etc.).
- **Animations** — `fadeIn`, `modalIn`, `cardIn`, `pulse`.

The aesthetic is a dark gradient backdrop with glassmorphism panels and a
purple/cyan/magenta accent palette pulled from HSL ramps. Google Fonts:
`Inter` for body, `Outfit` for headings.

## Notable design choices

- **No optimistic updates.** Simpler reasoning, and broadcasts are fast on
  loopback / LAN; if you want optimism, apply it in the emit handlers and
  reconcile in the server-broadcast handlers.
- **Comments are eager-loaded** with the full board. Fine for retro-scale
  data; if a board grew unbounded, switch to lazy-loading per card.
- **No router-level layout** beyond a header — keeps the bundle tiny.
