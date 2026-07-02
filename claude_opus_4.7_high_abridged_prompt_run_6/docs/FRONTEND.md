# Frontend Architecture

The frontend lives in [`client/`](../client) and is a Vite + React + TypeScript SPA.

## Stack

- **React 18** with React Router 6
- **@hello-pangea/dnd** for drag-and-drop between columns
- **socket.io-client** for real-time state
- **Vite** dev server (with proxy to the backend on port 4000)
- Custom CSS in [`src/styles.css`](../client/src/styles.css) — dark palette, Google Fonts (Inter + Outfit), gradient accents, and micro-animations.

## Directory layout

```
client/src/
├── main.tsx              # Bootstraps React + Router
├── App.tsx               # Shell (header, footer, routes)
├── styles.css            # Global styles + theme tokens
├── api.ts                # REST client wrappers
├── socket.ts             # Singleton socket.io-client
├── types.ts              # Domain types shared with backend responses
├── ui.ts                 # Small helpers (avatar colors, initials, relative time)
├── useDisplayName.ts     # Session-scoped guest identity hook
├── pages/
│   ├── MainPage.tsx      # Board list + create-board form
│   └── BoardPage.tsx     # The retro board with drag-and-drop and sockets
└── components/
    ├── GuestAuthModal.tsx    # Prompts for a display name on first entry
    └── CardDetailModal.tsx   # Card + comments view
```

## Routes

| Path              | Component   | Purpose                          |
| ----------------- | ----------- | -------------------------------- |
| `/`               | `MainPage`  | Landing / list / create.         |
| `/board/:boardId` | `BoardPage` | The realtime board.              |

Any unmatched path falls back to the React app (the Express server serves `index.html` for non-API routes when running in production).

## State model

- The **server is the source of truth**. React holds a local copy of the board tree and updates it in two ways:
  1. **REST fetch** in `BoardPage` on mount and on socket reconnect — guarantees consistency.
  2. **Socket.io events** (`card_added`, `card_moved`, `comment_added`) — merged into local state as they arrive.
- Guest identity is stored in `sessionStorage` under `reflect.displayName`. It survives reloads within the tab but not new tabs — which is the intended "one seat per session" behaviour for a lightweight retro tool.

## Drag-and-drop

`@hello-pangea/dnd` is used because it's the maintained fork of `react-beautiful-dnd` and handles nested scrolling cleanly.

The local drop applies an optimistic reorder immediately, and the server's `card_moved` broadcast (which carries the full column ordering) replaces the entire card ordering — so if two people drag at once, the server's final ordering wins.

## Styling philosophy

- **Dark palette** anchored on deep blue/violet with pink + cyan accents. Colour tokens live in `:root` at the top of `styles.css`.
- **Google Fonts**: `Inter` for UI text, `Outfit` for display headings.
- **Gradients + glass**: the hero card and modals use a gradient border trick (outer gradient container, inner solid dark panel).
- **Micro-animations**: shimmer on the brand mark, pulse on the "real-time" pill, rise-in for modals, and lift-on-hover for cards and buttons.
- **Responsive**: columns stack horizontally with `overflow-x: auto` for wide boards; hero and toolbars collapse below 700px.

## Real-time flow

```
User types in Add Card → BoardPage.handleAddCard
   → socket.emit('add_card', {...})
   → Server writes to SQLite
   → Server broadcasts 'card_added' to room:board:<id>
   → BoardPage listener merges the new card into state
```

Because the client emits and the server broadcasts to every socket in the room (including the sender), we don't do local optimistic inserts for add operations — the round trip is fast enough that a single source of truth is simpler and avoids duplicates. Drag-and-drop, by contrast, is optimistic because DnD feedback needs to be instant.

## Type-checking

```bash
npm run typecheck            # backend + client
npm --prefix client run typecheck
```
