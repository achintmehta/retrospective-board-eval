# Frontend Architecture

The client is a Vite + React SPA living under `client/`. It speaks to the Express server over REST for snapshots and Socket.io for real-time mutations.

## Stack

- **React 18** with React Router for two routes: `/` (home) and `/boards/:boardId`
- **Vite** dev server on `:5173`, with proxy rules forwarding `/api` and `/socket.io` to Express on `:4000`
- **`@hello-pangea/dnd`** for drag-and-drop between columns
- **`socket.io-client`** as a singleton shared across the page

## Component map

```
App                         -> routing shell + header
├── HomePage                 -> list boards, create board form
└── BoardPage                -> the live retro board
    ├── GuestAuthModal       -> shown when no display name in localStorage
    ├── DragDropContext      -> drives card moves
    │   └── Column (×N)      -> Droppable per column
    │       ├── Card (×N)    -> Draggable; toggles inline comments
    │       │   ├── CommentList
    │       │   └── CommentForm  -> emits add_comment
    │       └── AddCardForm  -> emits add_card
    └── AddColumnForm        -> POSTs /api/boards/:id/columns
```

## State flow

The board is fetched once via REST on mount (full snapshot, including comments). After that, all mutations are driven by Socket.io:

1. User performs an action (e.g., drag a card or submit a card form).
2. Client emits a socket event with an ack callback.
3. Server persists to SQLite and broadcasts to the board's room.
4. Every client (including the one that initiated) handles the broadcast and updates its in-memory board state.

For drag-and-drop the client also applies an *optimistic* update before the broadcast arrives, so the UI feels instant. If the server rejects the move, the page refetches the board to reconcile.

On reconnect (Socket.io handles this automatically), `BoardPage` re-emits `join_board` and refetches the board snapshot to recover from any events missed during the disconnect.

## Display names

- Stored in `localStorage` under `retro:displayName` via the `useGuestName` hook
- The `BoardPage` shows a modal until a name is set
- The same name is used as `author_name` for every card and comment created in this session

## Drag and drop

`@hello-pangea/dnd` is the maintained fork of `react-beautiful-dnd`. We use it for its accessible-by-default behavior and clean React API:

- Each column is a `Droppable` with id `column-<id>` and `type="CARD"`
- Each card is a `Draggable` with id `card-<id>`
- `DragDropContext.onDragEnd` reads the source/destination ids, applies the optimistic update, and emits `move_card`

## Styling

A single `styles.css` file owns the design system: a small set of custom properties (colors, spacing) and component classes. Dark theme by default; columns scroll independently when their content overflows.

## Building for production

`npm run build` from the repo root invokes `npm --prefix client run build`, which writes `client/dist/`. The Express server detects `client/dist/` at startup and serves it directly under `/`, falling back to `index.html` for client-side routes other than `/api/*` and `/socket.io/*`.
