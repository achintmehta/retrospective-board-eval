# Frontend Architecture

The client is a small React + Vite application. There are exactly two routes,
no global state library, and one Socket.io connection per board.

## Routes

| Path                 | Component                       | Purpose                                |
|----------------------|---------------------------------|----------------------------------------|
| `/`                  | `src/pages/MainPage.jsx`        | List boards, create a new board        |
| `/boards/:boardId`   | `src/pages/BoardPage.jsx`       | Realtime board view                    |
| `*`                  | redirect to `/`                 | Fallback                               |

React Router (`react-router-dom` v6) handles navigation; see
`src/main.jsx`.

## Component tree (BoardPage)

```
BoardPage
├── GuestAuthModal           (shown until a display name is chosen)
├── header                   (board title, presence pill, Export CSV button)
├── DragDropContext          (@hello-pangea/dnd)
│   └── board-columns
│       ├── Column           (one per board column)
│       │   └── Card         (Draggable)
│       └── add-column form
└── CardModal                (when a card is opened — comments + add comment)
```

## State management

Local component state only:

- `BoardPage` owns the full `board` object (mirrors the server snapshot).
- All realtime updates flow through pure reducers at the bottom of
  `BoardPage.jsx`:
  - `applyCardAdded(board, card)`
  - `applyCardMoved(board, { cardId, toColumnId, toPosition })`
  - `applyCommentAdded(board, comment)`
  - `applyColumnAdded(board, column)`
- Reducers are idempotent — they ignore entities they've already applied —
  so the sender of an event can apply it optimistically and then receive the
  same broadcast back from the server without duplicating anything.

## Realtime flow

1. `useEffect` in `BoardPage` fetches the board over REST and sets local
   state.
2. A second `useEffect` (depending on `boardId` and `name`) creates a socket,
   emits `join_board`, and re-applies the server snapshot from the ack
   (handles reconnects too).
3. UI actions emit Socket.io events:
   - Adding a card → `add_card` → server broadcasts `card_added`.
   - Dropping a card → optimistic local move + `move_card` → server
     broadcasts `card_moved` (idempotent for the sender).
   - Adding a comment → `add_comment` → server broadcasts `comment_added`.
4. Adding a column uses REST (`POST /api/boards/:id/columns`); the server
   broadcasts `column_added` to other clients.

## Guest auth

`src/session.js` persists the chosen display name in `sessionStorage` keyed
by board id (`retro:displayName:<boardId>`). The name lives only for the
current browser session — opening a new tab or window asks again.

`GuestAuthModal` is rendered as long as `name` is falsy; once submitted it
unmounts and the realtime `useEffect` proceeds to connect.

## Styling

A single hand-rolled stylesheet, `src/styles.css`. Dark theme with CSS custom
properties so the palette can be tweaked in one place.

## Build & dev

| Command                | What it does                                                  |
|------------------------|---------------------------------------------------------------|
| `npm run dev`          | Vite dev server at :5173, proxies `/api` and `/socket.io`     |
| `npm run build`        | `vite build` → `client/dist`                                  |
| `npm run preview`      | Serve the production build locally                            |

In production the Express server serves `client/dist` from the same origin,
so no CORS or proxy configuration is required.

## Where things live

```
client/src/
├── api.js                    fetch wrapper (REST)
├── socket.js                 socket.io-client factory
├── session.js                display-name persistence
├── styles.css                global styles
├── main.jsx                  React Router setup
├── pages/
│   ├── MainPage.jsx          board list + create-board form
│   └── BoardPage.jsx         board view + realtime state
└── components/
    ├── GuestAuthModal.jsx    display name prompt
    ├── Column.jsx            droppable column + add-card form
    ├── Card.jsx              draggable card
    └── CardModal.jsx         card detail + comments
```
