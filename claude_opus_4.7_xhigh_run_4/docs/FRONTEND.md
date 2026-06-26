# Frontend

The frontend is a single-page React + Vite app living in `client/`. It talks to the backend over REST for board CRUD and over Socket.io for everything that needs to be live.

## File layout

```
client/
├── index.html
├── vite.config.js          # dev server + /api and /socket.io proxy → :4000
└── src/
    ├── main.jsx            # React DOM entry
    ├── App.jsx             # Router setup (BrowserRouter + Routes)
    ├── api.js              # REST helpers
    ├── socket.js           # singleton socket.io-client + emitWithAck()
    ├── styles.css          # global styles (dark theme, board layout)
    ├── hooks/
    │   └── useDisplayName.js   # localStorage-backed display name state
    ├── pages/
    │   ├── MainPage.jsx        # list + create boards
    │   └── BoardPage.jsx       # board view + realtime wiring
    └── components/
        ├── Board.jsx           # column grid, drag-and-drop, add-column tile
        ├── AddCardForm.jsx     # inline card-creation form
        ├── CardModal.jsx       # card detail + comments
        └── GuestAuthModal.jsx  # display-name prompt
```

## Routing

`App.jsx` mounts a `BrowserRouter` with two routes:

- `/` — `MainPage`
- `/boards/:boardId` — `BoardPage`

The dev server is configured (`vite.config.js`) to fall back to `index.html` for unknown paths so the router can take over. In production, `server/index.js` serves any non-`/api`/`/socket.io` GET with `client/dist/index.html`.

## Display name (guest auth)

`useDisplayName` persists the name in `localStorage` under `retro-board.displayName`. `BoardPage` short-circuits to render `GuestAuthModal` until a name is set; the modal validates non-empty input ≤ 60 chars.

There is no per-board scoping — once you set a name it carries between boards. A "Change name" button in the board header clears it and re-prompts.

## State and real-time wiring

`BoardPage` owns the board document fetched from `GET /api/boards/:id`. After the user provides a display name, the page:

1. Connects (or reuses) the singleton socket from `socket.js`.
2. Emits `join_board { boardId, displayName }`. On ack `ok`, it refetches the board to pick up anything that landed between fetch and join.
3. Subscribes to `card_added`, `card_moved`, `comment_added`, and `column_added`.

Update flow:

| Action            | Optimistic                                                 | Server source-of-truth                                        |
|-------------------|------------------------------------------------------------|---------------------------------------------------------------|
| Add card          | none — wait for `card_added` broadcast                     | server emits `card_added` to room; reducer appends if new      |
| Move card         | local splice + reorder applied immediately                 | server emits `card_moved`; client refetches for canonical order |
| Add comment       | none — wait for `comment_added`                            | server emits `comment_added`; reducer appends if new           |
| Add column        | direct setState from REST response                         | server also emits `column_added`; reducer dedupes by id        |

The reducers all guard against duplicate entries (e.g. an action triggered locally arrives back as a broadcast) by checking ids before appending.

A "connection status" pill in the header reflects two pieces of state: socket `connected` and `joined` (received a successful `join_board` ack since the last connect). On disconnect both flip false and the next `connect` triggers a fresh `join_board` and refetch.

## Drag and drop

`@hello-pangea/dnd` wraps everything inside `<Board>`:

- Each column is a `<Droppable droppableId={column.id}>`.
- Each card is a `<Draggable draggableId={card.id} index={i}>`.

`onDragEnd` ignores no-ops (same column + same index), applies the move optimistically, then emits `move_card`. If the emit fails, an error banner appears and the page refetches.

## Forms & inputs

- `AddCardForm` collapses to a "+ Add card" button. Enter submits; Shift+Enter inserts a newline; Esc cancels.
- `CardModal` renders the card body + comment list and a textarea for replying. Cmd/Ctrl+Enter submits.
- `MainPage` create-board form is a single inline `<input>` + button. Successful creation navigates straight to the new board.

## Styling

`styles.css` defines a dark theme with CSS custom properties (`--bg`, `--surface`, `--accent`, ...) plus classes for the column grid (`.column`, `.column-cards`, `.card`) and modals. No CSS framework — everything is hand-rolled to keep the dependency surface small.

## Configuration

The frontend has no build-time configuration; it always speaks to relative paths (`/api/...`, `/socket.io/...`). In dev, Vite proxies those to `http://localhost:4000` (`vite.config.js`). In production, the backend serves both the static bundle and these endpoints from the same origin.

## Error handling

- REST errors raise an `Error` with the server-provided message. `BoardPage` surfaces them in an error banner with a "Dismiss" action.
- Socket ack errors do the same and, for move failures, trigger a board refetch to resync.
- Connection drops are shown via the header pill; the user can keep reading and writes will resume after reconnect.

## Production build

```
npm --prefix client run build
```

Outputs to `client/dist/`. The Express server (`server/index.js`) auto-detects that directory and serves it. The Dockerfile builds the client in a separate stage and copies just `dist/` into the final image.
