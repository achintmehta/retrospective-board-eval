# Frontend architecture

The frontend is a Vite + React + TypeScript SPA. It talks to the backend over
`/api/*` (REST) and `/socket.io` (WebSocket). During development, the Vite
dev server on port `5173` proxies both paths through to the backend on `4000`.

## Design language

The visual system is intentionally darker and richer than a plain MVP. Every
choice is centralised in `src/styles/global.css` as CSS custom properties so
that the palette, radii, easing curves, and shadows can be tuned without
touching individual components.

- **Typography:** Google Fonts `Inter` for body copy, `Outfit` for display
  headings. Both are loaded via `<link>` tags in `client/index.html`.
- **Palette:** Deep near-black background (`--bg-void`) with iridescent
  violet → cyan gradient accents (`--grad-primary`). Each column receives one
  of four subtle tint gradients (`--tint-1` … `--tint-4`) that cycle by index,
  and its dot glyph glows in a matching accent colour.
- **Motion:** Custom cubic-bezier easings (`--ease-standard`,
  `--ease-emphasized`, `--ease-bounce`) and reusable keyframe animations
  (`fade-up`, `scale-in`, `pulse`, `shimmer`, `card-in`, `orbit`).
- **Micro-interactions:** Hover lifts, gradient-fill CTA buttons, rotating `+`
  glyphs, presence dot pulse, connection-status pill colours, and a
  double-orb loader.

## Route map

Routing is handled with `react-router-dom` (`BrowserRouter` in `main.tsx`).

| Path            | Component      | Purpose                                           |
| --------------- | -------------- | ------------------------------------------------- |
| `/`             | `HomePage`     | List all boards and offer a "Create board" form   |
| `/boards/:id`   | `BoardPage`    | Live retrospective board, drag-and-drop, comments |
| `*`             | `NotFoundPage` | 404 fallback                                      |

## Component tree

```
App
├── HomePage
│   └── TopBar
├── BoardPage
│   ├── TopBar (with title crumb + ConnectionPill + Export + display-name chip)
│   ├── PresenceBar
│   ├── GuestAuthModal            ← shown while displayName is null
│   └── DndContext                ← @dnd-kit/core
│       ├── SortableContext × N   ← one per column
│       │   └── BoardColumn
│       │       └── RetroCard × N ← useSortable, expandable comment panel
│       ├── AddColumnControl
│       └── DragOverlay
│           └── RetroCardOverlay
└── NotFoundPage
```

## State model

State is split by responsibility:

### `useDisplayName`

Tiny hook backed by `localStorage`. Stores the guest display name across
sessions and tabs (listens for the `storage` event so a name entered in one
tab is picked up in another).

### `useBoardSocket`

The heart of the client. Given `(boardId, displayName)`, it:

1. Opens a Socket.io connection.
2. Emits `join_board` on `connect` (and on reconnect); the ack payload
   contains the full board, which becomes the initial state.
3. Subscribes to `card_added`, `card_moved`, `comment_added`, `column_added`,
   and `presence`, funnelling them into a `useReducer` (see
   `boardReducer` in the same file) that keeps the local `BoardWithChildren`
   in sync.
4. Exposes `addCard`, `moveCard`, `addComment`, and `refresh` action creators
   that emit the corresponding wire events.
5. Reports a `ConnectionStatus` (`connecting | connected | reconnecting |
   error`) so the UI can render the connection pill in the top bar.

The reducer is deliberately idempotent — every action checks whether the
incoming card / comment already exists before appending. That way, an
optimistic UI or a network hiccup that duplicates an event cannot corrupt
state.

### Local UI state

- `BoardPage` owns which card is expanded (`openCardId`) and the currently
  dragging card meta (`dragMeta`).
- `BoardColumn` owns its inline "Add card" composer open/close state.
- `RetroCard` owns its local comment draft.
- `HomePage` owns its "Create board" form value.

No global store (Redux/Zustand) is needed — the socket hook already provides a
single source of truth for board data.

## Drag-and-drop

The board uses `@dnd-kit/core` + `@dnd-kit/sortable`. Two id prefixes let a
single collision handler distinguish drop targets:

- `card:<id>` — a sortable card
- `col:<id>` — a column's droppable region (matters for empty columns and for
  drops that land below the last card)

`BoardPage.handleDragEnd` handles four cases:

- **Dropped on a column** → append to the end of that column.
- **Dropped on a card, different column** → insert at that card's index.
- **Dropped on a card, same column** → compute the new index with
  `arrayMove` so the semantics match sortable's expectations.
- **No move** → skip emitting the event when the source and target are
  identical.

Because the server is the source of truth, the client never mutates state
locally on drag-end. Instead it emits `move_card`; the reducer applies the
change when the `card_moved` broadcast arrives. This keeps every client
identical, at the cost of one round-trip of latency.

## Files at a glance

| Path                                        | Purpose                                                 |
| ------------------------------------------- | ------------------------------------------------------- |
| `src/main.tsx`                              | React root + `BrowserRouter`                            |
| `src/App.tsx`                               | Route table                                             |
| `src/pages/HomePage.tsx`                    | Board list + create form                                |
| `src/pages/BoardPage.tsx`                   | Board orchestrator: DnD, socket, modals                 |
| `src/pages/NotFoundPage.tsx`                | 404 page                                                |
| `src/components/TopBar.tsx`                 | Sticky brand + slotted right/center content             |
| `src/components/GuestAuthModal.tsx`         | Display-name gate on entering a board                   |
| `src/components/BoardColumn.tsx`            | Column shell, droppable area, add-card composer         |
| `src/components/RetroCard.tsx`              | Sortable card with author avatar and comments panel     |
| `src/components/AddColumnControl.tsx`       | Empty-state "Add column" tile at the end of the strip   |
| `src/components/PresenceBar.tsx`            | Avatar stack of everyone currently in the room          |
| `src/components/ConnectionPill.tsx`         | Live / connecting / offline status chip                 |
| `src/hooks/useDisplayName.ts`               | Persist display name in `localStorage`                  |
| `src/hooks/useBoardSocket.ts`               | Board state + socket wiring + presence                  |
| `src/lib/api.ts`                            | Typed REST client                                       |
| `src/types.ts`                              | Shared data-model types                                 |
| `src/styles/global.css`                     | Design tokens, primitives, animations                   |

Each component has a co-located `.css` file when it has bespoke styling beyond
the global primitives. Naming is BEM-adjacent (`.retro-card`, `.retro-card-content`) — light on abstractions so a reader can grep straight to
the rule.
