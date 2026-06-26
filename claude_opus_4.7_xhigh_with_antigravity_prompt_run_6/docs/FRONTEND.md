# Frontend architecture

The client lives entirely under `client/` and is a vanilla Vite + React 18 app.
No TypeScript. No CSS framework — a hand-rolled design system in `src/styles/index.css`.

## Stack

- **React 18** — function components + hooks
- **Vite 5** — dev server, HMR, production bundle
- **React Router 6** — `/` for the home page, `/boards/:boardId` for a single board
- **`@hello-pangea/dnd`** — accessible drag-and-drop, maintained fork of `react-beautiful-dnd`
- **`socket.io-client`** — single shared connection per browser tab
- **Outfit** + **JetBrains Mono** — loaded from Google Fonts in `index.html`

## Folder map

```
client/src/
├── main.jsx               # ReactDOM bootstrap + BrowserRouter
├── App.jsx                # app shell (header + routes)
├── pages/
│   ├── HomePage.jsx       # board list + "Create Board" form
│   └── BoardPage.jsx      # the board view (the main feature)
├── components/
│   ├── Avatar.jsx         # deterministic per-name colored avatar
│   ├── Toast.jsx          # auto-dismissing inline toast
│   ├── Modal.jsx          # generic backdrop modal (Esc + click-outside aware)
│   ├── GuestModal.jsx     # display-name prompt
│   ├── Column.jsx         # one board column (Droppable + header + AddCard)
│   ├── Card.jsx           # one draggable card
│   ├── AddCard.jsx        # inline "add a card" form
│   └── CommentsDrawer.jsx # right-side drawer for card discussion
├── lib/
│   ├── api.js             # tiny REST client (fetch wrapper)
│   ├── socket.js          # singleton socket.io connection
│   ├── session.js         # display name persisted to localStorage
│   └── time.js            # relative timestamps, avatar palette helpers
└── styles/index.css       # design tokens, components, animations
```

## Page lifecycle

### `HomePage`

1. On mount, calls `api.listBoards()` and renders a grid of board tiles.
2. The hero form (`POST /api/boards`) creates a new board and navigates to it.

### `BoardPage`

1. Reads `boardId` from the URL.
2. Checks localStorage (`session.getDisplayName()`); if no name is set, opens the
   `GuestModal` immediately and blocks interaction until the user picks one.
3. Fetches the board snapshot via `api.getBoard(boardId)`.
4. Opens the singleton Socket.io connection, emits `join_board`, and subscribes to
   `card_added`, `card_moved`, `comment_added`, `presence_updated`.
5. On reconnect, refetches the snapshot to guarantee no events were missed.
6. All user actions are emitted as Socket.io events:
   - **Adding a card** → `add_card` (server broadcasts → local state updates via
     `card_added` listener; we don't apply locally first because the server-assigned
     id/createdAt is the canonical record).
   - **Moving a card** → optimistic local move + `move_card` ack. If ack fails, the
     client refetches the snapshot to reconcile.
   - **Adding a comment** → `add_comment`, same broadcast-driven update flow.
7. Newly arriving cards/comments get a brief glow animation (`card-flash` /
   `comment-flash`) so the eye is drawn to live changes.

## State helpers

`BoardPage.jsx` keeps `board` state as `{ id, title, columns: [ { …, cards: [ { …, comments } ] } ] }`.
All updates flow through three pure functions:

- `insertCard(board, card)`
- `moveCardInState(board, cardId, fromColumnId, toColumnId, toIndex)`
- `appendComment(board, comment)`

They de-duplicate by id so that the optimistic update + server broadcast can both
arrive without producing duplicate UI nodes.

## Design system

`src/styles/index.css` defines:

- A **dark palette** (`--bg-*`, `--surface*`, `--violet`, `--pink`, `--rose`, …) with
  glassmorphism surfaces (translucent + `backdrop-filter: blur`).
- A primary gradient `--gradient-primary` (`violet → pink → rose`) used for the brand
  mark, CTAs and hover accents.
- Typography on `Outfit` + `JetBrains Mono` via Google Fonts.
- Reusable utility classes: `.btn`, `.input`, `.textarea`, `.card-surface`,
  `.ghost-button`, `.icon-btn`, `.label`, `.eyebrow`, `.pill`, `.conn-chip`, etc.
- Micro-animations: brand bar pulse, presence dot pulse, modal/drawer entrance,
  card flash on remote update, button hover lifts.
- Responsive breakpoint at 720 px for mobile-friendly padding.

There are no third-party CSS dependencies — the look-and-feel is entirely portable.

## Accessibility notes

- All interactive elements have unique `id`s and `aria-label`s for browser testing
  and screen readers.
- The `GuestModal` traps focus on its input and is non-dismissable until a name is
  entered.
- The comments drawer can be closed with `Escape`, click-outside, or the close button.
- The drag-and-drop layer uses `@hello-pangea/dnd`, which ships full keyboard
  navigation out of the box (`Space` to grab, arrow keys to move, `Space` to drop).
