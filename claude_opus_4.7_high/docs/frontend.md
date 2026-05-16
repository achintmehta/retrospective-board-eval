# Frontend Overview

The frontend is a Vite + React + TypeScript single-page application living
under `client/`. It is intentionally small — no global state library, no
CSS framework — to keep the project trivially understandable.

## Stack

- **React 18** with the `react-jsx` runtime.
- **Vite** for dev server (with HMR) and production bundling.
- **react-router-dom v6** for the two routes (`/` and `/boards/:boardId`).
- **socket.io-client** for the real-time channel.
- **@hello-pangea/dnd** (a maintained fork of `react-beautiful-dnd`) for
  drag-and-drop between columns.

## Routes

| Path                | Component   | Purpose                                          |
|---------------------|-------------|--------------------------------------------------|
| `/`                 | `MainPage`  | Lists boards and lets the user create a new one. |
| `/boards/:boardId`  | `BoardPage` | The live, collaborative retro board.             |

## File layout

```
client/src/
├── main.tsx            Mounts the app and configures the router.
├── styles.css          Global styling (CSS variables + utility classes).
├── api.ts              Tiny `fetch` wrapper exposing typed REST helpers.
├── socket.ts           Singleton Socket.io client (`getSocket`/`disconnectSocket`).
├── types.ts            TypeScript interfaces matching the backend's JSON shapes.
├── pages/
│   ├── MainPage.tsx    Renders the board list and create-board form.
│   └── BoardPage.tsx   Loads a board, opens the socket, wires DnD + UI handlers.
└── components/
    ├── GuestNameModal.tsx  Asks for a display name on first board visit.
    ├── Column.tsx          Droppable column rendering its cards + add-card form.
    └── CardItem.tsx        Single card with collapsible comments + comment form.
```

## Real-time data flow

1. `BoardPage` calls `GET /api/boards/:id` to seed local state.
2. `getSocket()` opens a Socket.io connection (singleton across remounts).
3. The page emits `join_board` with `{ boardId, displayName }`.
4. UI actions (add card, move card, add comment) are emitted as Socket.io
   events. The server is the single source of truth: it persists to SQLite,
   then broadcasts a `*_added` / `*_moved` event to everyone in the room
   (including the originator).
5. The page applies inbound events to local state. On reconnect we re-emit
   `join_board` and refetch the board to recover from drift.

For drag-and-drop the client also performs an *optimistic* local reorder so
the dragged card snaps in place immediately; the authoritative `card_moved`
event will then arrive and reconcile.

## Display name (guest auth)

A display name is stored in `sessionStorage` under `retro-board:displayName`.
While unset, `BoardPage` shows the `GuestNameModal` and refuses to open the
socket. Sessions clear when the tab is closed, matching the "frictionless
boarding" non-goal of full identity.

## Local development

```bash
npm run install:all
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` and `/socket.io` to
`http://localhost:4000`, so changes to either side hot-reload independently.

## Production

`npm run build` runs `tsc -b && vite build`, emitting `client/dist/`. The
backend automatically serves this directory if it exists, so a single Node
process on port 4000 hosts the entire app.
