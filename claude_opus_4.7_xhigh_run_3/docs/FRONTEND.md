# Frontend Architecture

The frontend is a React 18 single-page app scaffolded with Vite. It talks to the
backend over a small REST surface for board lifecycle operations and over
Socket.io for real-time collaboration.

## Stack

| Concern             | Choice                            |
|---------------------|-----------------------------------|
| Build / dev server  | Vite 5                            |
| UI framework        | React 18                          |
| Routing             | `react-router-dom` v6             |
| Drag and drop       | `@hello-pangea/dnd`               |
| Realtime client     | `socket.io-client` v4             |
| State management    | Local component state + custom hooks (no Redux) |

## Routes

| Path             | Component   | Purpose                                     |
|------------------|-------------|---------------------------------------------|
| `/`              | `HomePage`  | List boards, create a new board.            |
| `/boards/:id`    | `BoardPage` | View a board, collaborate in realtime.      |

`App.jsx` declares the routes; `main.jsx` mounts the `BrowserRouter`.

## Component tree

```
<App>
├─ <HomePage>
│  ├─ create board form
│  └─ list of <Link to="/boards/:id"> cards
└─ <BoardPage>
   ├─ <NameModal>             (when no display name)
   ├─ board toolbar           (title, presence indicator, "Export CSV")
   └─ <DragDropContext>
      └─ <Column>              (one per column)
         ├─ <Droppable>
         │  └─ <Card> (×N)     (one per card)
         └─ inline "add card" form
      └─ <AddColumn>           (always last)
   └─ <CommentDrawer>          (modal when a card is opened)
```

## Data flow

1. `BoardPage` fetches the full board (`GET /api/boards/:id`) on mount.
2. Once the user has set a display name (persisted in `localStorage`), the
   `useBoardSocket` hook opens a Socket.io connection and joins the board room.
3. Three socket events are handled to keep the board state in sync:
   - `card_added` → append the new card to its column.
   - `card_moved` → remove the card from its source column and insert it at the
     reported position in the destination column.
   - `comment_added` → push the comment into the matching card.
4. User actions (`add_card`, `move_card`, `add_comment`) are emitted to the
   server via the hook's `emitWithAck` helper. The server persists and
   broadcasts, so all clients (including the originator) update via the same
   incoming event — except for drag-and-drop, which is applied optimistically
   for responsiveness and reconciled from the server's broadcast.
5. Column creation goes through REST (`POST /api/boards/:id/columns`) and is
   patched into local state on success.

## Key files

### `src/lib/api.js`

Thin `fetch` wrapper that exposes typed helpers (`api.listBoards`,
`api.createBoard`, `api.getBoard`, `api.createColumn`, `api.exportUrl`). Errors
are normalized to `Error` instances with the server's error message when
available.

### `src/lib/identity.js`

Persists the guest display name in `localStorage` under `retro-display-name`.
The user is prompted via `NameModal` the first time they open a board.

### `src/hooks/useBoardSocket.js`

Encapsulates the Socket.io lifecycle:

- Creates a connection lazily when `enabled` is true and a board id is known.
- Joins the board's room on connect.
- Wires `card_added`, `card_moved`, `comment_added` listeners to handlers
  passed in via props (kept fresh in a ref so the listeners don't re-subscribe
  on every render).
- Exposes `addCard`, `moveCard`, `addComment` helpers that emit events and
  resolve a promise from the server ack.
- Exposes a `connected` boolean used to render a presence indicator.

### `src/pages/BoardPage.jsx`

Owns the board state and contains four pure reducers:

- `addColumnToBoard(prev, column)`
- `addCardToBoard(prev, card)`
- `moveCardInBoard(prev, { cardId, fromColumnId, toColumnId, position })`
- `addCommentToBoard(prev, comment)`

Each reducer is idempotent (it ignores events for entities it already has) so
that a client that emitted an action and also receives the broadcast does not
double-apply it.

### `src/components/Column.jsx`, `Card.jsx`

Render a column or a card and integrate with `@hello-pangea/dnd`'s `Droppable`
and `Draggable` primitives. `Column` also embeds the inline "add card" form so
that participants can dump thoughts quickly without leaving the column.

### `src/components/CommentDrawer.jsx`

A modal overlay that shows the source card and all comments and exposes a form
to add a new one. The modal is keyed on the open card id and closes when the
backdrop is clicked.

## Styling

A single hand-rolled `styles.css` (no CSS framework) provides a dark theme
tuned for stand-up rooms with low ambient light. Layout uses flexbox; columns
are horizontally scrollable for wide retros.

## Local development

```bash
npm --prefix client install
npm --prefix client run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` and
`/socket.io` to the backend on `:4000` (see `client/vite.config.js`).
