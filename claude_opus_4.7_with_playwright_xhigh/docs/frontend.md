# Frontend

A Vite + React (TypeScript) single-page app served by the same Node process
in production.

## Layout

```
client/src/
├── main.tsx          # React + Router bootstrap
├── App.tsx           # App shell with header + routes
├── api.ts            # REST API helpers (typed wrappers around fetch)
├── socket.ts         # Singleton socket.io-client instance
├── session.ts        # Display name persistence (sessionStorage)
├── types.ts          # Shared TypeScript types
├── styles.css        # Global styles
├── pages/
│   ├── MainPage.tsx  # List of boards + create board form
│   └── BoardPage.tsx # Board view with realtime DnD + comments
└── components/
    ├── GuestAuthModal.tsx
    ├── AddCardForm.tsx
    ├── AddColumnForm.tsx
    └── CommentsModal.tsx
```

## Routing

| Path | Component |
| --- | --- |
| `/` | `MainPage` — list boards, create new board |
| `/boards/:boardId` | `BoardPage` — full retro board |

`react-router-dom` is used in BrowserRouter mode. The Express server has a
catch-all that serves `client/dist/index.html` so deep links work in production.

## Guest session

`BoardPage` reads a display name from `sessionStorage` (key `retro:displayName`).
If absent, it renders `GuestAuthModal` and stores whatever the user enters.
Sessions are scoped to the browser tab to keep things low-friction — closing
the tab requires a fresh display name on the next visit.

## Realtime model

`BoardPage` keeps a single `FullBoard` object in state. On mount it:

1. `GET /api/boards/:id` to seed the state.
2. Connects to Socket.io and emits `join_board` with `{ boardId, displayName }`.
3. Subscribes to `card_added`, `card_moved`, and `comment_added` and merges
   each event into local state.

User actions go through three flows:

- **Add card / add comment** — emit a socket event; the server-broadcast event
  is what actually appends to local state (also for the originator).
- **Move card** — apply an optimistic local move immediately, then emit
  `move_card`. If the server NACKs, the page refetches the board to recover.
- **Add column** — call `POST /api/boards/:id/columns`, then append the new
  empty column to local state. (Other clients only see the column once they
  refresh; column changes are intentionally not broadcast in this iteration.)

On a socket `reconnect`, the page rejoins the room and refetches the board
to pick up anything missed while offline.

## Drag and drop

Implemented with `@hello-pangea/dnd` (the maintained fork of
`react-beautiful-dnd`). Each column is a `Droppable`, each card is a
`Draggable`. Card click (without a drag) opens the comments modal.

## CSV export

The `Export CSV` button is a plain `<a download>` pointing at
`/api/boards/:id/export`. The browser handles the file download natively.
