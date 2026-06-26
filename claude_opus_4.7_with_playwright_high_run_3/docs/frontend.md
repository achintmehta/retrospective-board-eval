# Frontend Architecture

The client is a single-page React app built with Vite. It is intentionally small — no global state manager — because the app has exactly two screens and a single live data set per route.

## Stack

- **React 18** with hooks.
- **React Router 6** for routing (`/` and `/boards/:id`).
- **socket.io-client** for the real-time channel.
- **@hello-pangea/dnd** for drag-and-drop. (Maintained fork of `react-beautiful-dnd`.)
- **Vite** for dev server, HMR, and production bundling.

## Files

```
client/src/
├── main.jsx                  ReactDOM root + <BrowserRouter>
├── App.jsx                   <Routes> shell with shared header
├── styles.css                Global styles (CSS custom properties)
├── api.js                    Tiny REST client wrapper
├── socket.js                 Singleton socket.io-client connection
├── pages/
│   ├── MainPage.jsx          Board list + create form
│   └── BoardPage.jsx         Live board view with DnD, comments, export
└── components/
    ├── GuestAuthModal.jsx    Display-name prompt
    ├── Column.jsx            Column header, droppable, add-card form
    └── Card.jsx              Draggable card + comments thread
```

## Routes

| Path             | Component   | Notes                                                                                  |
|------------------|-------------|----------------------------------------------------------------------------------------|
| `/`              | `MainPage`  | `GET /api/boards`, plus a create form (`POST /api/boards`) that navigates to the board. |
| `/boards/:id`    | `BoardPage` | Full board state; subscribes to live updates; renders DnD board.                        |

## State Model

State is colocated per page. There is no Redux/Zustand/Context layer.

- `MainPage` owns its `boards` list and the new-board form state.
- `BoardPage` owns the full `board` object (`{ id, title, columns: [{ ..., cards: [{ ..., comments }] }] }`). Each socket event applies a minimal reducer-style update on this single piece of state.
- The display name is stored in `sessionStorage` under `retro:displayName`. It is per-tab, ephemeral, and never sent over REST — only included in WebSocket payloads.

## Real-Time Flow

`BoardPage` opens the singleton socket (`getSocket()` from `socket.js`) once a display name is set, then:

1. Emits `join_board` with `boardId`.
2. Listens for `card_added`, `card_moved`, `comment_added`, applying minimal patches to `board` state.
3. On `connect` (covers reconnects), refetches the full board via REST and re-joins the room — this is the recovery path described in `design.md`.
4. On unmount, emits `leave_board` and removes listeners.

User actions emit Socket.io events instead of REST:
- `add_card` when submitting the add-card form.
- `move_card` from `onDragEnd` of the `DragDropContext`.
- `add_comment` from a card's comment form.

Each event's success path is the broadcast — the server's `card_added` / `card_moved` / `comment_added` echo back, and the same reducer applies the change. This keeps the local sender's state in sync with the source of truth without optimistic-vs-broadcast reconciliation.

## Guest Authentication

Mounting `BoardPage` without a display name renders `GuestAuthModal` over the board. The modal writes to `sessionStorage` and to component state; the socket subscription is gated on `displayName`, so no events fire until a name is set.

## Styling

A single `styles.css` with CSS custom properties for color tokens. The layout is a horizontal flex row of columns; columns and the "Add Column" placeholder are fixed-width and the row scrolls horizontally on small screens.

## Building

- `npm run dev` (root) runs Vite (`5173`) and the backend (`3001`) concurrently; Vite proxies `/api` and `/socket.io` to the backend.
- `npm run build` (root) runs `vite build` and emits `client/dist`, which the production Express server serves as static assets plus a SPA fallback.
