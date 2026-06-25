# Prism Retro — Frontend Guide

The frontend is a React 18 single-page app built with Vite. It speaks REST
for board lifecycle (create / list / fetch / export) and Socket.io for every
realtime mutation (cards, moves, comments, presence).

## Routing

`react-router-dom` provides two routes inside `App.jsx`:

| Path                | Component   | Purpose                                                        |
| ------------------- | ----------- | -------------------------------------------------------------- |
| `/`                 | `MainPage`  | Hero, create-board form, list of all boards.                   |
| `/boards/:boardId`  | `BoardPage` | Live board with columns, cards, comments, CSV export, presence. |

The header (`App.jsx`) is shared and shows a *back to all boards* link on the
board route.

## State flow

```
┌──────────────┐   REST    ┌──────────┐
│   MainPage   │ ────────► │  /api/…  │
└──────────────┘ ◄──────── └──────────┘

┌──────────────┐   REST (initial load)   ┌──────────┐
│  BoardPage   │ ─────────────────────► │  /api/…  │
│              │ ◄───────────────────── └──────────┘
│              │
│              │   Socket.io (all mutations + presence)
│              │ ───────────────────────────────┐
│              │ ◄──────────────────────────────┘
└──────────────┘
```

`BoardPage` owns the full board state. The initial load hydrates from
`GET /api/boards/:id`. From then on, mutations are emitted over the socket
and the server broadcasts the canonical event to every connected client —
including the originator. Local drag-and-drop applies an *optimistic* update
so the dragger feels zero latency, then the server's `card_moved` event
arrives and (in the simple case where positions agree) is a no-op.

## Guest authentication

The first time a user lands on a board, `BoardPage` renders
`GuestAuthModal`. The modal collects a display name, persists it in
`sessionStorage` under `prism.displayName`, and unblocks the socket
`join_board` handshake. The name is reused across all boards in the same
tab session.

## Drag-and-drop

`@dnd-kit/core` drives the gesture. Each column is a `useDroppable`; each
card is `useSortable`. On `onDragEnd`, `BoardPage` figures out the target
column/position by inspecting the `over` payload:

- If `over.data.current.type === 'column'`, the card is dropped at the end
  of the empty column.
- If `over.data.current.type === 'card'`, the position is taken from the
  hovered card's index (within-column reorder) or its column index
  (cross-column drop).

`DragOverlay` renders a `CardOverlay` preview so the dragged card visually
detaches from the layout and feels weightless.

## Visual language

The design system lives in `src/index.css`. Tokens (colors, radii, shadows,
easings, fonts) are defined as CSS custom properties on `:root` so every
component opts into the same palette and motion curves.

Highlights:

- **Aurora background.** Three blurred radial blobs (`--c-violet`,
  `--c-pink`, `--c-gold`) drift slowly behind the app for a premium,
  cinematic feel.
- **Glassmorphism.** The header, modal, board cards, and columns use
  semi-transparent backgrounds with `backdrop-filter: blur(…)`.
- **Gradient typography.** The hero headline applies the brand gradient via
  `background-clip: text`.
- **Type pairing.** Body text uses Inter; headlines use Space Grotesk for
  a slightly more editorial display feel.
- **Micro-animations.** Card entry, modal entry, toast entry, button hover,
  presence pulse, and aurora drift all use the shared easing curves
  (`--ease-out`, `--ease-in-out`).
- **Per-column accent.** `.column[data-index="N"] .column__dot` rotates
  through five distinct gradients so the columns read at a glance.

## Component map

```
src/
├── App.jsx                        Shell, header, aurora background
├── main.jsx                       Router + entry
├── api.js                         Tiny fetch wrapper
├── socket.js                      Lazy Socket.io client singleton
├── index.css                      Design system + every component class
├── pages/
│   ├── MainPage.jsx               Hero, create-board form, boards grid
│   └── BoardPage.jsx              Live board with DnD + presence + CSV
└── components/
    ├── GuestAuthModal.jsx         First-visit display-name prompt
    ├── Column.jsx                 Droppable column, add-card form
    └── Card.jsx                   Sortable card + nested comments
```

## Extending the UI

- **New column types.** Add the column on the board via the planned
  *Add column* affordance (see `POST /api/boards/:id/columns`) — the gradient
  dot palette already covers index 0–4. Add more by extending the
  `.column[data-index="N"]` rules in `index.css`.
- **New event types.** Add handlers to `server/realtime.js`, then subscribe
  in `BoardPage.jsx` next to `card_added` / `card_moved` / `comment_added`.
- **New surfaces.** Reuse the `.btn`, `.input`, `.textarea`, `.modal`, and
  `.create-card` classes — the tokens guarantee they match the brand.
