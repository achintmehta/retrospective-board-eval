# Frontend Guide

The client is a small Vite + React 18 app. It uses React Router for routing,
`@hello-pangea/dnd` for drag-and-drop, and `socket.io-client` for real-time
updates. There's no state management library — board state lives in the
`BoardPage` component and is mutated in response to Socket.io broadcasts.

## Layout

```
client/src/
├── main.jsx              # ReactDOM root + <BrowserRouter>
├── App.jsx               # Routes: "/", "/boards/:boardId"
├── api.js                # Thin fetch wrapper around the REST API
├── socket.js             # Lazy singleton Socket.io client + ack-helper
├── styles.css            # Single global stylesheet (dark theme)
├── pages/
│   ├── HomePage.jsx      # Board list + "Create board" form
│   └── BoardPage.jsx     # The retro board itself
└── components/
    ├── NamePrompt.jsx    # Guest display-name modal
    ├── Column.jsx        # Droppable column with add-card form
    └── Card.jsx          # Single card + comments thread
```

## Routes

| Path                 | Component  | What it does                                        |
| -------------------- | ---------- | --------------------------------------------------- |
| `/`                  | `HomePage` | Lists boards, lets the user create a new one        |
| `/boards/:boardId`   | `BoardPage`| Loads a board, joins its Socket.io room, renders it |

## Session "auth"

There's no real auth. `BoardPage` reads `retro-board:display-name` from
`sessionStorage`; if missing, it shows `<NamePrompt>` and writes the name back
to `sessionStorage` on submit. The name is sent with every Socket.io event so
the server can stamp cards and comments with it.

## Data flow

1. `BoardPage` calls `api.getBoard(id)` to render an initial snapshot.
2. It also calls `socket.emit('join_board', ...)` — the ack response returns
   the board fresh from the server, so we use that to overwrite the snapshot
   and avoid drift.
3. Mutations are sent over Socket.io with ack callbacks (`emitAck`). The server
   writes to SQLite and broadcasts an event back to every client in the room
   (including the sender) — handlers in `BoardPage` apply the change.
4. Drag-and-drop applies an **optimistic** local update first, then emits
   `move_card`. If the ack fails, we refetch the board to recover.

## Real-time event handlers

In `BoardPage`'s effect we subscribe to:

- `card_added` — append the card to its column.
- `card_moved` — splice the card out of its old column and into the new one at
  the given index. We tolerate the "originator" case where the card has
  already been moved optimistically.
- `comment_added` — append the comment to the matching card's `comments` array.

All handlers are cleaned up on unmount.

## Drag-and-drop

`@hello-pangea/dnd` wraps each column in a `<Droppable>` and each card in a
`<Draggable>`. On `onDragEnd` we:

1. Bail out if `destination` is null or unchanged.
2. Optimistically move the card in local state.
3. Emit `move_card` with the destination column and target index.

The server normalises `position` integers for every card in both source and
destination columns, then broadcasts a `card_moved` event. Other clients
receive the broadcast and replay the move.

## Styling

A single `styles.css` keeps the surface area tiny. Layout uses CSS Grid /
Flexbox; the columns row scrolls horizontally so wide boards still work on
small screens.
