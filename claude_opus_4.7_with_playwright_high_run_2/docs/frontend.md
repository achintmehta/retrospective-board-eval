# Frontend Overview

The client is a small React (18) + Vite SPA. It uses `react-router-dom` for routing, `socket.io-client` for live updates, and `@hello-pangea/dnd` for drag-and-drop.

Source lives in `client/src/`.

---

## Routes

| Path                  | Component        | Purpose                                 |
| --------------------- | ---------------- | --------------------------------------- |
| `/`                   | `HomePage`       | List boards, create a new board         |
| `/boards/:boardId`    | `BoardPage`      | View a single board, collaborate live   |

`App.jsx` mounts the router and a thin header.

---

## Modules

### `api.js`
Thin `fetch` wrapper for the REST endpoints (`listBoards`, `createBoard`, `getBoard`, `createColumn`) and an `exportBoardUrl(boardId)` helper that returns the CSV download URL.

### `session.js`
Reads/writes the user's display name to `sessionStorage`. There is no persistent account — closing the tab clears the name.

---

## Pages

### `pages/HomePage.jsx`
- Fetches the board list on mount.
- Form: "Create a new board" → `POST /api/boards`, then navigate to `/boards/<id>`.
- Lists existing boards with creation timestamps; clicking a row navigates to the board.

### `pages/BoardPage.jsx`
The bulk of the app logic. Responsibilities:

1. **Guest auth gate.** If no display name in `sessionStorage`, renders `<NamePrompt />` instead of the board.
2. **Initial fetch.** REST `GET /boards/:id` populates the board.
3. **Socket lifecycle.**
   - On mount, opens a Socket.io connection, emits `join_board`, and uses the ack to refresh the board.
   - Subscribes to `card_added`, `card_moved`, `comment_added` and merges them into local state. New items are deduped by id (so the sender's own broadcast is a no-op).
4. **Mutations.** All writes go through Socket.io (`add_card`, `add_comment`, `move_card`); the server then broadcasts the change. Adding a column uses the REST endpoint plus a refetch.
5. **Drag-and-drop.** `<DragDropContext onDragEnd={...}>` wraps the columns. On drop, the page performs an optimistic local reorder and emits `move_card`. If the server rejects, it refetches and shows an error.
6. **CSV export.** A simple `<a>` link to `/api/boards/:id/export` triggers the browser download (the server sets `Content-Disposition: attachment`).
7. **Connection pill.** Shows "live" when the socket is connected, "offline" otherwise.

---

## Components

### `components/NamePrompt.jsx`
Modal form prompting for a display name. Submits to the parent's `onSubmit` callback.

### `components/Column.jsx`
Renders a column with its header, a `<Droppable>` body containing its cards, and an inline "Add card" form. The form expands inline when "+ Add card" is clicked.

### `components/Card.jsx`
Renders a single card as a `<Draggable>`. Includes:
- Card content and author.
- A "Show/Hide comments (N)" toggle.
- When expanded: the comment list and an "Add a comment…" form.

---

## State strategy

The full board lives in `BoardPage` state. Socket events surgically patch that state (adding cards, moving them between columns, adding comments). The server is the source of truth — on reconnect, we refetch via `join_board`.

Drag-and-drop applies an optimistic local update first so the UI feels instantaneous, then asks the server to persist. Reconciliation comes through the `card_moved` broadcast (deduped by card id).

---

## Vite proxy

`vite.config.js` proxies `/api` and `/socket.io` (with WebSocket upgrade) from `http://localhost:5173` to `http://localhost:4000` during development. In production both are served from the same origin by Express, so no proxy is needed.

---

## Styling

A single `client/src/styles.css` with CSS custom properties for theming. No CSS framework, no preprocessor — small surface area, easy to skim.
