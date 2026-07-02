# Frontend architecture

React 18 + Vite. Routing via `react-router-dom`. Drag-and-drop via `@dnd-kit`. Realtime via `socket.io-client`. No global state library — component state is enough for a
board-scoped app, and Socket.io is the source of truth for cross-user updates.

## File map

```
src/
  main.jsx                Vite entry, mounts <App/> in <BrowserRouter/>
  App.jsx                 Header + route table (HomePage, BoardPage)
  styles.css              Single stylesheet, dark theme, gradients, animations

  api.js                  Thin fetch wrapper for REST calls
  socket.js               createBoardSocket() returns a fresh Socket.io client

  hooks/
    useDisplayName.js     LocalStorage-backed guest name (key: retro:displayName)

  pages/
    HomePage.jsx          Hero + create form + boards grid
    BoardPage.jsx         Board shell: fetch, socket wiring, DnD, drawer

  components/
    NameModal.jsx         Blocking modal until a display name is chosen
    Column.jsx            Droppable column with sortable card list + "Add card"
    Card.jsx              Sortable card tile with author chip + comment count
    CommentsPanel.jsx     Slide-in drawer with comment list + composer
```

## Data flow

```
+--------------------+     REST      +--------------------+
| GET  /api/boards   | <-----------> | HomePage           |
| POST /api/boards   |               |                    |
+--------------------+               +--------------------+

+--------------------+   REST init   +--------------------+
| GET /api/boards/:id| <-----------> | BoardPage (setup)  |
+--------------------+               +--------------------+

                       Socket.io     +--------------------+
   Server room  <---------- join --- | BoardPage (live)   |
   card_added   ---------- push ---> |                    |
   card_moved   ---------- push ---> |  updates React     |
   comment_added----------- push --> |  state in place    |
                                     +--------------------+
```

BoardPage keeps the board tree in local state. Sockets patch that tree on each broadcast.
On (re)connect the page also refetches the full board via REST so temporary disconnects
never leave the UI stale.

## Drag and drop

`@dnd-kit/core` provides `DndContext`, `useDroppable` (for columns), and `DragOverlay`.
`@dnd-kit/sortable` provides `useSortable` for card reordering inside a column. On drop:

1. Compute `targetColumnId` and `targetIndex` from the `over` node.
2. **Optimistically** patch local state so the card visually lands immediately.
3. Emit `move_card` — the server confirms and re-broadcasts, which will be a no-op for
   the initiating client and a real state change for everyone else.

## Design system (styles.css)

- **Fonts:** Google Fonts — `Inter` for UI, `Outfit` for display.
- **Palette:** deep navy background with brand purple `#7c5cff`, cyan `#22d3ee`, and pink `#f472b6` gradients. Per-column accents cycle through six palettes.
- **Motifs:** rounded surfaces, glass panels via `backdrop-filter: blur`, gradient
  borders via masked pseudo-elements, and subtle animations (`card-in`, `slide-in`,
  `modal-in`, `shimmer`, `pulse-ring`).
- **Micro-interactions:** button arrows slide on hover, cards lift on hover, connection
  pill has a live "pulse" ring when connected.

Every visual style lives in `styles.css` — no CSS-in-JS, no Tailwind — so it's a single
file to skim to understand or restyle the app.

## Adding a new realtime event

1. Handle the event on the server in `server/realtime.js` — persist + broadcast.
2. Emit it from BoardPage's action handler (see `handleAddCard` / `handleAddComment`).
3. Add a `socket.on('<event>', ...)` inside BoardPage's connect effect that patches the
   local board tree.
4. (Optional) Add an optimistic UI update alongside the emit.
