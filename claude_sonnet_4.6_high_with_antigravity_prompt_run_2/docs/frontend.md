# Frontend Architecture

The frontend is a React single-page application bootstrapped with Vite, located in the `client/` directory.

## Key Libraries

| Library | Purpose |
|---------|---------|
| `react-router-dom` | Client-side routing |
| `socket.io-client` | Real-time WebSocket connection |
| `@hello-pangea/dnd` | Drag-and-drop for cards |

## Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `MainPage` | List boards and create new ones |
| `/board/:id` | `BoardPage` | The interactive retro board |

## Component Tree

```
App (BrowserRouter + Nav)
├── MainPage
│   └── Board cards grid
└── BoardPage
    ├── GuestAuthModal (shown until user sets display name)
    ├── Board header (title, connection badge, export, add column)
    ├── DragDropContext
    │   └── Column[]
    │       ├── Droppable zone
    │       │   └── Card[] (each Draggable)
    │       └── Add card form
    └── Comments panel (slide-in overlay)
```

## State Management

All state is managed with React `useState` hooks in `BoardPage`. There is no global state library.

- **`board`** — Full board object (columns → cards → comments). Updated both from initial REST fetch and incoming Socket.io events.
- **`userName`** — Stored in `sessionStorage` so it persists across page refreshes within the same browser tab.
- **`selectedCard`** — The card whose comments panel is open.
- **`connected`** — Socket.io connection status for the UI badge.

## Socket.io Integration

The socket is created in a `useEffect` that runs when `userName` is set. The socket is torn down (`socket.disconnect()`) on component unmount or when `userName`/`id` changes.

**Event flow for adding a card:**
1. User submits the "Add card" form in `Column`
2. `Column` calls `onAddCard(columnId, content)` (prop from `BoardPage`)
3. `BoardPage` emits `add_card` via the socket
4. Server saves to DB and broadcasts `card_added`
5. `BoardPage` receives `card_added` and updates `board` state
6. React re-renders the updated `Column`

**Drag-and-drop flow:**
1. User releases a dragged card (`DragDropContext.onDragEnd`)
2. `BoardPage` applies an optimistic UI update immediately
3. `move_card` event is emitted to the server
4. Server updates DB and broadcasts `card_moved` to other clients

## Design System

Styles live in `src/index.css` using CSS custom properties (design tokens). No CSS framework or preprocessor is used. Key tokens:

- Colors: `--accent-primary` (#6c63ff), `--bg-base`, `--text-primary`
- Spacing/radii: `--radius-sm/md/lg/xl`
- Typography: Inter (body), Outfit (display/headings)
- Animations: `fadeIn`, `slideInRight`, `slideUp`, `pulse`
