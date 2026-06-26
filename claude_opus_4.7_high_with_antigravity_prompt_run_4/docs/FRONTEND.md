# Frontend guide

The frontend is a small Vite + React 18 SPA living under `client/`.

## Layout

```
client/
├── index.html
├── vite.config.js          # dev proxy for /api and /socket.io
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx            # React entry, mounts <BrowserRouter>
    ├── App.jsx             # top bar + route table
    ├── index.css           # full design system (tokens, components, animations)
    ├── api.js              # tiny REST client (fetch wrapper)
    ├── socket.js           # singleton socket.io-client + emitAck helper
    ├── components/
    │   ├── Toast.jsx        # context-based toast notifications
    │   ├── GuestNameModal.jsx
    │   ├── Avatar.jsx       # hashed-color initials avatar
    │   ├── Column.jsx       # draggable cards + inline composer
    │   └── CommentDrawer.jsx
    └── pages/
        ├── HomePage.jsx     # board list + creation
        └── BoardPage.jsx    # the live retro board
```

## Routing

`react-router-dom` v6.

| Path             | Component   | Notes                                              |
| ---------------- | ----------- | -------------------------------------------------- |
| `/`              | `HomePage`  | Lists existing boards, creates new ones.           |
| `/boards/:id`    | `BoardPage` | Joins the realtime room, renders columns + cards.  |
| `*`              | 404         | Friendly "back home" page.                         |

## State model on the Board page

The board page holds the whole board tree in local state:

```ts
type Board = {
  id: string;
  title: string;
  columns: Array<{
    id: string;
    title: string;
    position: number;
    cards: Array<{
      id: string;
      column_id: string;
      content: string;
      author_name: string;
      position: number;
      created_at: number;
      comments: Array<{
        id: string;
        card_id: string;
        content: string;
        author_name: string;
        created_at: number;
      }>;
    }>;
  }>;
};
```

State is updated in two places:

1. **Optimistic local update** for drag-and-drop, so the card snaps into place immediately.
2. **Server broadcast** for *any* mutation (the server is the source of truth, and we
   ignore the optimistic update if the broadcast disagrees — by simply applying the
   broadcast on top).

The pure helpers `applyCardAdded`, `applyCardMoved`, `applyCommentAdded`, and
`applyColumnAdded` live at the top of `BoardPage.jsx` and keep the reducer-style
updates testable and isolated.

## Real-time wiring

`socket.js` exports a lazy singleton `getSocket()` plus an `emitAck()` helper that wraps
`socket.emit` in a `Promise` so we can `await` server acknowledgements (and surface
errors via toasts).

On the Board page we:

1. Fetch the board via REST (`GET /api/boards/:id`).
2. Show the guest-name modal if `localStorage["retro:displayName"]` is unset.
3. `emit('join_board', { boardId, displayName })` once both are available.
4. Listen for `card_added`, `card_moved`, `comment_added`, `column_added`, and the two
   `presence_*` events.
5. On `connect` after a disconnect, rejoin the room *and* refetch the board so state is
   guaranteed to match the server.

## Drag and drop

`@hello-pangea/dnd` (the maintained fork of `react-beautiful-dnd`) handles drag &
drop. The whole `.columns` region is wrapped in `<DragDropContext onDragEnd={…}>`, each
column is a `<Droppable>`, and each card is a `<Draggable>`. On drop we both optimistically
update local state *and* emit `move_card` so the server can persist + broadcast.

## Design system

`index.css` is structured as:

1. **Tokens** — colors, gradients, radii, shadows, typography.
2. **Reset** — minimal element resets.
3. **Background** — animated radial-gradient mesh + faint grid overlay.
4. **Components** — `.btn`, `.input`, `.glass`, `.card`, `.column`, etc.
5. **Page-specific** styles (home hero, board header, drawers, modals, toasts).

Typography uses [Inter](https://fonts.google.com/specimen/Inter) for body text and
[Outfit](https://fonts.google.com/specimen/Outfit) for headings, both loaded via Google
Fonts in `index.html`.

## Adding a feature

1. **REST surface?** Add it in `src/routes/` on the backend, then in `client/src/api.js`
   on the frontend.
2. **Realtime surface?** Add the event in `src/sockets/index.js` (server) + a listener in
   `BoardPage.jsx`. Don't forget the corresponding pure reducer next to the others.
3. **UI?** Reuse the design tokens. Prefer composing `.glass`, `.btn`, etc. over writing
   ad-hoc classes.
