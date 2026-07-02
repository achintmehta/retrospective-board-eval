# Frontend Reference

## Stack

- **React 18** with functional components and hooks
- **Vite 5** for dev server + build (proxies `/api` and `/socket.io` to `:4000`)
- **TypeScript** end-to-end
- **React Router v6** — two routes (`/`, `/boards/:boardId`)
- **`@hello-pangea/dnd`** — actively-maintained fork of `react-beautiful-dnd`, drag-and-drop for cards
- **`socket.io-client`** — a single shared connection (`src/socket.ts`)
- **Vanilla CSS** (`src/styles/global.css`) — CSS custom properties, gradients, subtle animations. No CSS framework; keeps the bundle lean.

## Directory layout

```
client/
├── index.html                    # Google Fonts preload (Inter + Outfit)
├── vite.config.ts                # Dev proxy for /api + /socket.io
├── src/
│   ├── main.tsx                  # React root + <BrowserRouter>
│   ├── App.tsx                   # Topbar + route switch
│   ├── api.ts                    # Typed fetch client for REST
│   ├── socket.ts                 # Lazy singleton socket.io client
│   ├── session.ts                # Display-name persistence (localStorage)
│   ├── pages/
│   │   ├── MainPage.tsx          # Hero + boards grid + create form
│   │   └── BoardPage.tsx         # Realtime board with columns & drawer
│   ├── components/
│   │   ├── GuestModal.tsx        # Display-name prompt
│   │   ├── Column.tsx            # Droppable column + inline "add card"
│   │   └── CommentDrawer.tsx     # Right-side comments panel
│   └── styles/global.css         # Design tokens + component styles
```

## Pages

### `MainPage`
- Fetches `/api/boards` on mount.
- Hosts the "Create board" hero form; on success, navigates to `/boards/:id`.
- Skeleton loaders while fetching; empty state when there are no boards.

### `BoardPage`
Owns the entire live experience:

1. **Bootstraps state**: `api.getBoard(id)` on mount, then joins the Socket.io room via `join_board`.
2. **Guest gate**: if `localStorage.getItem('retro:displayName')` is empty, renders `GuestModal` first.
3. **Realtime subscriptions** (deduped by id on merge — safe for the originator to receive their own broadcast):
   - `card_added` → append to matching column
   - `card_moved` → remove from source column, insert into target column at `newPosition`
   - `comment_added` → append to matching card
4. **Optimistic UI**: DnD updates local state before emitting `move_card`. Card/comment adds are not optimistic — they land on broadcast — which keeps the animation clean and avoids ordering surprises.
5. **Reconnect recovery**: on `connect`, we re-emit `join_board` and refetch the board via REST to reconcile any missed events.

### Drag-and-drop
- `DragDropContext` wraps all columns.
- Each column is a `Droppable` with its own `droppableId`.
- Each card is a `Draggable` (whole card is the drag handle).
- On `onDragEnd` we reflow the local model and emit `move_card`; the server broadcasts `card_moved` back and the merge is idempotent.

### Comments
- Click any card → `CommentDrawer` slides in from the right.
- Comments render bottom-to-top by `created_at` ASC.
- New comments emit `add_comment` and are appended via the `comment_added` broadcast.

## State ownership

- **Server = source of truth.** Local state is a projection built from the initial REST fetch and then patched by broadcasts.
- **No dedicated state library.** All board state lives in `BoardPage` component state; drilled to `<Column>` and `<CommentDrawer>` via props. The board tree is small enough (a few columns × tens of cards) that React re-renders are trivially cheap and Redux/Zustand would be overkill.

## Design system

- **Fonts**: Inter (body/UI), Outfit (headings) — both loaded from Google Fonts in `index.html`.
- **Color**: dark base with violet → cyan brand gradient (`--grad-brand`), pink accents. Column titles get rotating gradient accents so columns are visually distinguishable at a glance.
- **Motion**: micro-interactions on hover (lift + shadow), `float` keyframe on hero glows, subtle `rise` entry animation on cards/boards, shimmer skeletons while loading, and a pulsing "live" status dot.
- **Glass & glow**: hero decor + drag-over states use blurred radial glows layered on translucent surfaces. Modal/drawer use `backdrop-filter: blur()`.
- **Tokens** are all CSS custom properties on `:root` — easy to retheme.

## Connection status

The topbar meta line under the board title shows either `Live · joined as <name>` (green pulsing dot) or `Reconnecting… · joined as <name>` (red dot), driven by the socket's `connect`/`disconnect` events.

## Adding features

- **New event?** Add a handler in `server/src/sockets/board-socket.ts`, then subscribe in the `BoardPage` `useEffect` and update local state on receipt. Keep merges idempotent (dedupe by id).
- **New REST endpoint?** Add to `server/src/routes/*.ts`, expose via `api.ts` typed client, call from a page/component.
- **New style token?** Add to the `:root` block in `styles/global.css` and reference via `var(--your-token)`.
