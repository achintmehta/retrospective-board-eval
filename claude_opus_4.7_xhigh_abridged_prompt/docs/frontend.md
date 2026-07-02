# Frontend Guide

The frontend is a single-page React application built with Vite. It lives in the
`client/` directory and is served from `client/dist` by the Node backend in production.

## Tech stack

- **React 18** with the App Router-agnostic `react-router-dom` v6.
- **Vite 5** for dev server, HMR, and production builds.
- **@hello-pangea/dnd** for drag-and-drop (a maintained fork of `react-beautiful-dnd`).
- **socket.io-client** for the real-time transport.
- Google Fonts **Inter** (body) and **Outfit** (display).

## Project layout

```
client/
├── index.html               # HTML shell + Google Fonts preconnect
├── vite.config.js           # dev server with /api and /socket.io proxy
├── package.json
└── src/
    ├── main.jsx             # React root, BrowserRouter
    ├── App.jsx              # header + <Routes>
    ├── components/
    │   ├── CardDetailsModal.jsx    # card viewer + comment thread
    │   ├── GuestModal.jsx          # display-name prompt
    │   ├── IdentityChip.jsx        # header badge / logout
    │   └── Toast.jsx               # tiny toast context
    ├── lib/
    │   ├── api.js           # REST wrapper
    │   ├── identity.js      # localStorage identity + avatar helpers
    │   └── socket.js        # cached socket.io-client instance
    ├── pages/
    │   ├── HomePage.jsx     # board list + create form
    │   ├── BoardPage.jsx    # the live board (this is the heart of the app)
    │   └── NotFoundPage.jsx
    └── styles/
        └── global.css       # design tokens + all component styles
```

## Routing

| Path         | Component     | Purpose                                 |
| ------------ | ------------- | --------------------------------------- |
| `/`          | HomePage      | List boards, create a new one.          |
| `/board/:id` | BoardPage     | Live board with cards, comments, DnD.   |
| `*`          | NotFoundPage  | Fallback.                               |

`BrowserRouter` is used with client-side navigation. The backend serves `index.html`
for any non-API, non-socket route so deep links (`/board/xyz`) work directly.

## State model

There are three sources of truth on the client:

1. **`localStorage` (`retro:displayName`)** — the guest display name persists across
   sessions. Set via the `GuestModal`, cleared via the header chip.
2. **REST fetch** — on entering a board page, we call `GET /api/boards/:id` to hydrate
   the board (columns, cards, comments). This also runs when a `move_card` rollback is
   needed.
3. **Socket.io broadcasts** — cards, comments, columns, and presence updates arrive as
   events and mutate local React state in-place. See `BoardPage.jsx` for the wiring.

## Real-time flow

```
User drag           handleDragEnd()
       │              │
       ▼              ▼
DragDropContext ─► optimistic setCards({...})
                     │
                     ▼
              socket.emit('move_card', { cardId, toColumnId, toIndex }, ack)
                     │
        server writes SQLite, broadcasts card_moved
                     │
                     ▼
             onCardMoved → setCards({...})       ← every client (including sender)
```

`add_card`, `add_comment`, and `add_column` follow the same pattern. `presence` is
emitted whenever anyone joins or leaves the board room and drives the header avatar
stack.

## Design system

All visual tokens live at the top of `src/styles/global.css` under `:root`:

- **Colour palette** — dark background (`--bg-0/1/2/3`), layered surfaces with alpha,
  three accents (`--accent-1/2/3`) that form the primary gradient.
- **Typography** — `Inter` for body, `Outfit` for display headings. Titles use a
  gradient text fill for a premium feel.
- **Radius, shadow, transitions** — expressed as CSS custom properties.

Utility classes: `.btn`, `.btn-primary`, `.btn-ghost`, `.input`, `.textarea`, `.panel`,
`.badge`, `.avatar`, etc. Micro-animations live inline via `@keyframes` — cards fade
in, modals lift, drag gets a subtle rotation.

### Extending the palette

Add or override tokens in `:root`. To retint the primary action, tweak
`--grad-primary` and the derived shadow `rgba` on `.btn-primary`.

### Avatar colours

`avatarGradient(name)` in `lib/identity.js` hashes the display name into one of eight
pre-defined gradients so a person's colour is stable across sessions.

## Development

- `npm run dev:client` — dev server on `:5173`.
- The dev server proxies `/api` and `/socket.io` to `:4000`.
- `VITE_BACKEND_URL` can override the proxy target if you're running the backend on a
  different host (e.g. `VITE_BACKEND_URL=http://192.168.1.10:4000`).

## Build

`npm run build` (root) runs `npm --prefix client run build` which produces
`client/dist/`. The Node backend picks that up automatically via
`express.static(CLIENT_DIST)`.
