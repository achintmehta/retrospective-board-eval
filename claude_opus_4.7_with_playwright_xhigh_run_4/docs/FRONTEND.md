# Frontend Overview

The frontend is a Vite-bundled React 18 single-page app under `client/`. It is
deliberately small — no global state manager, no design system, just React
hooks, React Router, Socket.io and `@hello-pangea/dnd`.

## Layout

```
client/
├── index.html
├── vite.config.js
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx             React entry — mounts <BrowserRouter><App /></BrowserRouter>
    ├── App.jsx              App shell + routes
    ├── styles.css           Global styles (CSS variables)
    ├── lib/
    │   ├── api.js           Thin fetch wrapper for REST
    │   ├── socket.js        Lazy Socket.io singleton
    │   └── displayName.js   localStorage helper for the guest name
    ├── pages/
    │   ├── HomePage.jsx     List + create boards
    │   └── BoardPage.jsx    Real-time board: state, sockets, drag/drop
    └── components/
        ├── NameModal.jsx    Guest auth modal
        ├── ColumnView.jsx   One retro column (header, droppable, add-card)
        └── CardItem.jsx     One card with comments
```

## Routes

| Path                   | Component   | Purpose                              |
|------------------------|-------------|--------------------------------------|
| `/`                    | `HomePage`  | List boards, create a new one.       |
| `/boards/:boardId`     | `BoardPage` | Realtime retro board.                |

## Data flow

```
       REST (one-shot reads + creates)            Socket.io (everything live)
            ┌──────────────────────┐               ┌─────────────────────────┐
HomePage ──▶│ GET /api/boards      │  BoardPage ──▶│ join_board              │
            │ POST /api/boards     │   (after      │ add_card / move_card    │
BoardPage ──│ GET /api/boards/:id  │    name set)  │ add_comment             │
            │ POST /…/columns      │               └─────────────────────────┘
            └──────────────────────┘                         │
                                                             ▼
                                                    card_added / card_moved /
                                                    comment_added / column_added
                                                    update local board state.
```

`BoardPage` fetches the full board over REST first so the layout paints even
before the socket connects. Once the user has a display name (from
`localStorage` or the modal), the page opens the Socket.io connection, joins
the board room and starts applying broadcast events to its local state.

## State management

`BoardPage` holds the canonical board shape in a single `useState` value:

```ts
{
  id, title, created_at,
  columns:  Column[],
  cards:    Card[],
  comments: Comment[],
}
```

This flat shape mirrors the API response and means each broadcast event is a
single-array update. Two `useMemo` selectors derive the per-column card lists
and per-card comment lists so re-renders only happen when the underlying lists
change.

Drag-and-drop applies an **optimistic** local move immediately, then emits
`move_card`. The server broadcasts the authoritative position back, which the
reducer applies idempotently — if the optimistic state already matched, nothing
visually changes.

## Guest auth

The "auth" is intentionally minimal: a modal collects a display name, which is
persisted to `localStorage` under `retro:displayName`. The same value is sent
in the `join_board` payload and stamped server-side on every card/comment the
socket creates — clients cannot spoof other display names mid-session because
the server ignores any name supplied in `add_card` / `add_comment`.

## Styling

`src/styles.css` defines CSS custom properties for the palette plus a small
set of component classes. No Tailwind, no CSS-in-JS — keep the surface area
predictable.

## Adding a feature

A typical feature touches three layers:

1. **DB** — extend `server/db/schema.sql` and `server/db/queries.js`.
2. **Transport** — add a Socket.io event handler in `server/sockets/index.js`
   (and/or a REST route under `server/routes/`).
3. **UI** — handle the new event in `BoardPage.jsx` (update local state),
   then surface it through a `components/` element.

Where possible, prefer Socket.io for anything collaborative; reserve REST for
operations that need a request/response or are infrequent (initial load,
export).
