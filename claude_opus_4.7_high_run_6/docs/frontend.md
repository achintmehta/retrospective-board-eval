# Frontend Architecture

The client is a small React 18 single-page app built with Vite. There is no
global state library — board state lives in the `BoardPage` component, which
mirrors the server's source-of-truth model in local React state and updates it
from Socket.io broadcasts.

## Entry points

- `client/index.html` — Vite-served HTML shell.
- `client/src/main.jsx` — mounts `<App />` inside a `BrowserRouter`.
- `client/src/App.jsx` — defines two routes:
  - `/` → `HomePage`
  - `/boards/:id` → `BoardPage`

## Pages

### `HomePage`

Lists all existing boards and provides a "Create board" form. On submit it
calls `POST /api/boards` and navigates to the new board's URL.

### `BoardPage`

The heart of the app. Responsibilities:

1. **Guest auth** — if no display name is in `sessionStorage`, render the
   `GuestAuthModal` blocking the rest of the UI until one is supplied. This
   satisfies the "prompt for display name before interacting with the board"
   requirement.
2. **REST hydration** — fetch the full board (`columns`, `cards`, `comments`)
   on mount and on every reconnect to recover missed events.
3. **Socket lifecycle** — join the board room, install handlers for
   `card_added`, `card_moved`, `comment_added`, and clean up on unmount.
4. **Optimistic UI** — on drag end, the dragged card snaps into the new
   position immediately. The server's `card_moved` broadcast then reconciles
   any drift; a server error rolls back via a fresh REST refetch.
5. **Mutations** — `add_card`, `move_card`, `add_comment` are all sent over
   Socket.io. Column creation uses the REST endpoint because it is a
   relatively low-frequency, structural change.

## Components

| Component         | Responsibility                                                       |
| ----------------- | -------------------------------------------------------------------- |
| `GuestAuthModal`  | Captures a display name and forwards it to the page state.           |
| `BoardColumn`     | Renders a column header and its list of cards. Drop target for DnD.  |
| `BoardCard`       | Renders a single draggable card with toggleable comment thread.      |
| `CardComments`    | Lists comments and accepts new ones.                                 |
| `AddCardForm`     | Inline expand/collapse form for adding cards to a column.            |
| `AddColumnForm`   | Inline form appended after the last column.                          |

## State shape

`BoardPage` keeps the server's response in `board`:

```js
{
  id, title, created_at,
  columns: [{ id, board_id, title, position, created_at }, ...],
  cards:   [{ id, column_id, content, author_name, position, created_at }, ...],
  comments:[{ id, card_id, content, author_name, created_at }, ...]
}
```

The `useMemo` block derives `cardsByColumn` and `commentsByCard` lookups so
the render is O(cards + comments) per change without re-grouping in every
child.

## Drag and drop

We use [`@hello-pangea/dnd`](https://github.com/hello-pangea/dnd) (the
maintained fork of `react-beautiful-dnd`). The shape:

- A single `<DragDropContext>` wraps all columns.
- Each `BoardColumn` declares a `<Droppable droppableId={column.id}>`.
- Each `BoardCard` is a `<Draggable draggableId={card.id} index={idx}>`.

`onDragEnd` patches local state optimistically, then emits `move_card` with
the destination column id and index. The server's reply is authoritative.

## API + socket helpers

- `client/src/api.js` — tiny `fetch` wrapper, exposes `api.listBoards`,
  `api.createBoard`, `api.getBoard`, `api.createColumn`, `api.exportUrl`.
- `client/src/socket.js` — lazy-initialized `socket.io-client` singleton.
  Uses same-origin connection so the Vite dev proxy and the production
  bundle both work without configuration.
- `client/src/guestSession.js` — display name persistence via
  `sessionStorage` (per-tab, by design — closing the tab drops the identity
  so a guest can be challenged again).

## Styling

A single `client/src/styles.css` file holds the entire stylesheet. The visual
language is a light, low-chrome card UI with custom CSS variables driving
colors and spacing. No CSS framework is required.
