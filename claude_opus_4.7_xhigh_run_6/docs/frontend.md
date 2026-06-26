# Frontend Guide

The client is a small React 18 app, bundled with Vite. It renders two pages:

- `/` — main page: list boards, create a board.
- `/boards/:boardId` — board page: realtime columns, cards, comments.

## File Tour

```
client/src/
├── main.jsx              React entry; sets up <BrowserRouter> + routes
├── App.jsx               Shell layout with header + <Outlet />
├── api.js                Thin fetch wrapper for /api/*
├── socket.js             Lazy singleton Socket.io client + emitWithAck()
├── session.js            sessionStorage get/set/clear for the display name
├── styles.css            Global styles (dark theme)
├── pages/
│   ├── MainPage.jsx      Boards list + "Create Board" form
│   └── BoardPage.jsx     Realtime board: reducer, sockets, DnD context
└── components/
    ├── GuestNameModal.jsx  Display-name prompt before joining a board
    ├── Card.jsx            Card body + expandable comments
    ├── AddCardForm.jsx     Inline new-card textarea per column
    └── AddColumnForm.jsx   Toggleable form to append a new column
```

## State on the Board Page

`BoardPage` keeps board state in a `useReducer`. The reducer is the single place that mutates `board.columns[].cards[]` so both REST-loaded data, optimistic local updates, and inbound socket broadcasts go through the same code paths.

Actions:

- `loaded` — initial REST fetch (or any forced refetch on reconnect).
- `column_added` — new column appended after a successful `POST /columns`.
- `card_added` — from `card_added` socket broadcast (idempotent on `card.id`).
- `card_moved` — used both **optimistically** during a drag-end and from inbound `card_moved` broadcasts. The reducer relocates the card to the requested `to_index` in `to_column_id` and removes it from `from_column_id`.
- `comment_added` — from `comment_added` broadcast (idempotent on `comment.id`).

If the user drags a card and the server rejects the move (`ok: false`), the page calls `refresh()` to resync from the REST endpoint.

## Sockets

`socket.js` exposes a lazy singleton. `BoardPage` joins `board:<id>` on mount and again on every `connect` event (so reconnects auto-rejoin), and leaves on unmount.

```js
socket.emit('join_board', boardId, ({ ok, error }) => { ... });
```

`emitWithAck(event, payload)` is a Promise wrapper for the ack callback pattern.

## Drag and Drop

`@hello-pangea/dnd` (the maintained fork of `react-beautiful-dnd`). Each column is a `<Droppable droppableId={column.id}>`, each card a `<Draggable draggableId={card.id} index={i}>`. On drop:

1. The reducer applies the move optimistically.
2. `emitWithAck('move_card', { cardId, toColumnId, toIndex })` syncs the server.
3. If the server replies with an error, the client refetches the board.

## Guest Auth

`GuestNameModal` is shown on the board page if `sessionStorage["retro:displayName"]` is empty. The name persists for the tab session and is attached to every card/comment emit.

## Styling

A single `styles.css` defines a dark theme via CSS variables. No CSS framework. Forms reuse a small set of utility classes (`muted`, `small`, `ghost`, `link-button`, `card-panel`, etc.).

## Dev vs. Production

- **Dev**: `npm run dev` runs Vite on `:5173`, which proxies `/api` and `/socket.io` to the Express server on `:3001`.
- **Prod**: `npm run build` produces `client/dist/`, which Express serves as static files; the SPA fallback route returns `index.html` for non-API paths.
