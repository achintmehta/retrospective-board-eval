# Frontend Reference

A small Vite + React app. There is no global state container — `BoardPage` owns the
board snapshot and updates it both from REST loads and Socket.io broadcasts.

## Layout

```
client/
├── index.html
├── vite.config.js          # dev server proxies /api + /socket.io to :4000
└── src/
    ├── main.jsx            # bootstraps React + BrowserRouter
    ├── App.jsx             # routes: "/" and "/boards/:boardId"
    ├── api.js              # tiny fetch wrapper for REST endpoints
    ├── socket.js           # singleton socket.io-client + emitWithAck helper
    ├── identity.js         # display-name persistence in localStorage
    ├── styles.css          # all styles
    ├── pages/
    │   ├── MainPage.jsx    # board list + "create board" form
    │   └── BoardPage.jsx   # board view, DnD, realtime, comment modal
    └── components/
        ├── GuestAuthModal.jsx
        ├── AddCardForm.jsx
        ├── AddColumnForm.jsx
        └── CardDetailsModal.jsx
```

## Routing

`BrowserRouter` from `react-router-dom`.

| Route | Component |
| --- | --- |
| `/` | `MainPage` |
| `/boards/:boardId` | `BoardPage` |
| `*` | 404 fallback |

The app header always links back to `/`.

## Realtime data flow

```
[BoardPage mount]
   │
   ├─ REST GET /api/boards/:id  ──► initial render
   │
   ├─ (if display name set) socket.emit('join_board', { boardId, name })
   │      └─ ack.board replaces local state
   │
   └─ subscribe: card_added, card_moved, comment_added, column_added
          on each event, merge into local state
          on reconnect, re-join (refetches snapshot)
```

User actions (add card, add comment, move card, add column) call REST or Socket.io with
ack callbacks. The server's broadcast is the canonical update — the local state simply
merges the broadcast. Card moves are applied optimistically so the drag feels snappy;
they roll back if the server rejects the move.

## Guest sessions

`identity.js` stores the display name in `localStorage` under `retro:displayName`. When
`BoardPage` renders with no name set, it shows `GuestAuthModal` instead of the board.
Submitting the modal persists the name and joins the realtime room.

## Drag-and-drop

`@hello-pangea/dnd` provides accessibility-friendly DnD (it's the maintained fork of
`react-beautiful-dnd`). Each column is a `Droppable`, each card is a `Draggable`. The
column's `Droppable` id is the column UUID, so `onDragEnd` can map directly into a
`move_card` emit:

```js
emitWithAck(socket, 'move_card', {
  cardId: draggableId,
  toColumnId: destination.droppableId,
  newIndex: destination.index,
});
```

Keyboard interaction (tab to focus, space to pick up, arrows to move, space to drop) is
supported out of the box by the library.

## Styling

A single `styles.css` with CSS custom properties (dark theme). No CSS-in-JS, no
component library — all styles are class-based and small.

## Building

- `npm run dev` (from `client/`) — Vite dev server on :5173 with HMR.
- `npm run build` — emits `client/dist/`. The Node server serves these files directly
  when they exist, so a single `node server/index.js` is enough for production.
