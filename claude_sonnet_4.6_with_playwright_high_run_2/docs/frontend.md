# Frontend Architecture

The frontend is a React single-page application built with Vite, located in the `client/` directory.

## Routing

Uses `react-router-dom` v6:

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `MainPage` | List all boards and create new ones |
| `/boards/:id` | `BoardPage` | View and interact with a specific board |

## Pages

### `MainPage`

- Fetches all boards via `GET /api/boards` on mount.
- Renders a form to create a new board.
- On board creation, navigates to `/boards/:id`.

### `BoardPage`

The primary page with full board interaction.

**State managed:**
- `board` — board metadata (title, id)
- `columns` — list of board columns
- `cards` — all cards on the board (filtered per-column in render)
- `comments` — all comments (filtered per-card in render)
- `displayName` — the guest's chosen name (persisted in `sessionStorage`)
- `socket` — the active Socket.io connection
- `selectedCard` — card currently open in the comment modal

**Lifecycle:**
1. Fetch initial board data via REST.
2. Show `GuestAuthModal` if no `displayName`.
3. Open a Socket.io connection and join the board room.
4. Listen for `card_added`, `card_moved`, `comment_added`, `column_added` to keep state in sync.
5. On reconnect, refetch the full board state to reconcile any missed events.

## Components

### `GuestAuthModal`

A modal overlay prompting the user to enter a display name. Saves the name to `sessionStorage` and dismisses.

### `Column`

Renders a board column. Uses `Droppable` from `@hello-pangea/dnd` as the drop target.

- Displays the column title and card count.
- Renders a list of `CardItem` components.
- Shows an inline "Add card" form.

### `CardItem`

Renders a single card. Uses `Draggable` from `@hello-pangea/dnd`.

- Displays card content and author name.
- Shows a comment count badge when comments exist.
- Clickable to open the `CommentModal`.

### `CommentModal`

A modal overlay for viewing and adding comments to a specific card.

- Displays all existing comments for the card.
- Shows an input form to post a new comment via Socket.io.
- Closes on outside click or the ✕ button.
- Automatically reflects new comments pushed via Socket.io (parent state update flows down as prop).

## Drag and Drop

Uses `@hello-pangea/dnd` (maintained fork of `react-beautiful-dnd`).

- `DragDropContext` wraps the entire board area in `BoardPage`.
- `Droppable` is used in each `Column` with `droppableId={column.id}`.
- `Draggable` is used in each `CardItem` with `draggableId={card.id}`.
- On `onDragEnd`, an optimistic UI update is applied locally and a `move_card` event is emitted to the server.

## Socket.io Client

The socket URL is determined by environment:
- **Development**: `http://localhost:3001` (bypasses Vite proxy for WebSocket reliability)
- **Production**: `/` (same origin as the served app)

The Vite dev server proxy is configured to forward `/api` and `/socket.io` paths to `http://localhost:3001`.
