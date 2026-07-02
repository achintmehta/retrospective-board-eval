# Frontend Guide

The frontend is a Vite + React 18 SPA using React Router v6, `@hello-pangea/dnd` for drag-and-drop, and `socket.io-client` for real-time updates.

## File map

```
client/
  index.html                        Loads Google Fonts + mounts <App />
  vite.config.js                    Proxies /api and /socket.io to the backend in dev
  src/
    main.jsx                        Router + StrictMode entry
    App.jsx                         Route shell
    api.js                          fetch() wrapper for REST calls
    socket.js                       Singleton Socket.io client
    useDisplayName.js               Guest display name persisted to localStorage
    pages/
      MainPage.jsx                  Boards list + create form
      BoardPage.jsx                 Full board, DnD, realtime events, export
    components/
      NameModal.jsx                 Prompt for guest display name
      Column.jsx                    Single column with cards + add form
      CardModal.jsx                 Card details + comment thread
    styles/
      global.css                    Design tokens, layout, animations
```

## Routes

| Path                    | Component     |
| ----------------------- | ------------- |
| `/`                     | `MainPage`    |
| `/boards/:boardId`      | `BoardPage`   |
| everything else         | redirect to `/` |

## State model

Local component state drives the UI; the server is the source of truth.

- `MainPage` fetches `/api/boards` once on mount and stores the list locally.
- `BoardPage` fetches `/api/boards/:id` on mount, then applies incremental updates from Socket.io events. On reconnect, it refetches to correct any drift.
- Optimistic drag-and-drop: the local column state is reordered immediately on drop, then the `move_card` event is emitted. A `card_moved` broadcast triggers a refetch to align exact positions across clients.

### `useDisplayName`

Reads / writes the guest name to `localStorage['retro:displayName']`. `BoardPage` shows `NameModal` until a name is set, and provides a `change` link in the header to reset it.

## Socket handling

`socket.js` exports a singleton created lazily via `io()` with `reconnection: true`. `BoardPage`:

1. Emits `join_board` on mount and after every `connect` / `reconnect`.
2. Registers listeners for `card_added`, `card_moved`, `comment_added`, `column_added`, and `presence`.
3. Cleans up listeners on unmount to avoid leaks in StrictMode double-invoke.

## Drag and drop

`@hello-pangea/dnd` (maintained fork of `react-beautiful-dnd`, React 18 compatible) wraps each column in a `Droppable` and each card in a `Draggable`. On drop, `handleDragEnd`:

1. Reorders cards locally (optimistic).
2. Emits `move_card` with `{ cardId, toColumnId, toIndex }`.
3. The server persists positions and broadcasts `card_moved`; a refetch keeps clients aligned.

## Design language

Design tokens live in `styles/global.css` under `:root`:

- **Fonts:** `Inter` (body) and `Outfit` (display), loaded from Google Fonts in `index.html`.
- **Palette:** deep near-black surfaces (`--bg-0` … `--bg-2`) with translucent overlays, violet → indigo → cyan accent gradients (`--accent-gradient`), and warm pink → violet for board titles.
- **Motion:** subtle micro-animations (`pulse`, `float`, `shimmer`, `pop-in`) and hover transforms on cards and buttons.
- **Depth:** glassmorphism (`backdrop-filter: blur`) on modals, columns, and the create-board panel; conic-gradient ambient glow behind the primary hero card.

## Adding a new realtime event

1. Add the handler on the server in `server/socket.js`, using existing validators and returning via `io.to(room(boardId)).emit(...)`.
2. In `BoardPage.jsx`, register the new listener alongside the others and update local state.
3. If it requires user input, add a small UI affordance to the appropriate component (see `Column.jsx` for the add-card pattern).

## Building and previewing

```bash
# Dev server (Vite HMR) — expects backend on :3001
npm --prefix client run dev

# Production build — output lands in client/dist and is served by Express
npm --prefix client run build
npm --prefix client run preview
```
