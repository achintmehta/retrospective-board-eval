# Frontend Guide

The client is a React 18 SPA built with Vite. There is no Redux/Zustand — a
single `useReducer` per board owns real-time state.

## Structure

```
client/
├── index.html
├── vite.config.js       # /api + /socket.io proxied to :4000 in dev
├── public/favicon.svg
└── src/
    ├── main.jsx         # BrowserRouter + route setup
    ├── App.jsx          # Shell, topbar, ambient background glows
    ├── pages/
    │   ├── HomePage.jsx   # Board list + create form
    │   └── BoardPage.jsx  # Realtime board (owner of the socket connection)
    ├── components/
    │   ├── NamePromptModal.jsx
    │   ├── Column.jsx
    │   ├── Card.jsx
    │   ├── CardDetailDrawer.jsx
    │   └── AddColumnButton.jsx
    ├── lib/
    │   ├── api.js         # Thin fetch wrapper
    │   ├── displayName.js # localStorage-backed session
    │   └── format.js      # Relative time, deterministic avatar colors
    └── styles/global.css
```

## Realtime Model

`BoardPage` opens one Socket.io connection per mount. On `connect` it emits
`join_board` and then refetches the full board via REST — this guarantees the
client is in sync even if events fired between the last refresh and the
reconnect. All subsequent updates come through Socket.io events and flow into
the reducer:

- `card_added` → append card to its column
- `card_moved` → splice card between columns and reorder locally
- `comment_added` → append comment to the target card
- `column_added` → append column

Drag-and-drop uses `@hello-pangea/dnd`. On drop we optimistically dispatch
`card_moved` locally, then emit `move_card` to the server. If the server rejects
the move (e.g. stale card id), we refetch to converge.

## Guest Sessions

`localStorage.retro.displayName` persists the user's name. If missing when
visiting `/board/:id`, `NamePromptModal` blocks the UI until the user provides
one. The name is sent with every `join_board` and used server-side as the
authoritative `author_name` for cards and comments.

## Design System

- **Fonts:** [Inter](https://fonts.google.com/specimen/Inter) for UI, [Outfit](https://fonts.google.com/specimen/Outfit) for display headings — both preloaded in `index.html`.
- **Palette:** deep midnight (`#07070f` → `#12132a`) with violet/pink/cyan accent gradients defined as CSS custom properties in `global.css`.
- **Motion:** micro-animations on card entry (`card-in`), drawer slide-in, modal pop-in, ambient glow drift, and shimmer on the hero title.
- **Avatars:** initials + a deterministic gradient derived from the display name (see `lib/format.js#colorFor`), so a user's chip color is stable across sessions and clients.

## Adding a Feature

1. Add a new REST endpoint in `server/routes.js` or a socket event in `server/sockets.js`.
2. Update `server/db.js` if the schema or a query changes.
3. Extend the reducer in `BoardPage.jsx` with the new event type.
4. Wire it into `lib/api.js` (REST) or emit from `BoardPage` (socket).
5. Add UI components under `client/src/components/`.
