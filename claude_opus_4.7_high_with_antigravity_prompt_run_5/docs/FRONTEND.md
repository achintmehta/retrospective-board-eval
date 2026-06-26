# Frontend Architecture

The client is a Vite + React 18 single-page app. It connects to the
backend over REST for initial loads and over Socket.io for live updates.

## Stack

- **Build:** Vite 5 (`client/vite.config.js` proxies `/api` and `/socket.io` to `localhost:4000` in dev).
- **Routing:** `react-router-dom` v6, two routes: `/` and `/board/:id`.
- **Realtime:** `socket.io-client`.
- **Drag-and-drop:** `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Styling:** Vanilla CSS, no framework. All design tokens live in `src/index.css`.

## File map

```
client/src/
├── main.jsx                # bootstraps React + BrowserRouter
├── App.jsx                 # routes
├── index.css               # design tokens, base styles, reusable utilities
├── pages/
│   ├── MainPage.jsx        # hero, create-board form, list of boards
│   ├── MainPage.css
│   ├── BoardPage.jsx       # socket lifecycle, dnd, presence, feed
│   └── BoardPage.css
├── components/
│   ├── Header.jsx          # sticky brand header + user pill
│   ├── GuestAuthModal.jsx  # blocks board access until a display name is set
│   ├── Column.jsx          # one retro column with sortable card list
│   ├── Card.jsx            # draggable card + collapsible comments panel
│   └── AddColumnTile.jsx   # inline form to add a new column
└── lib/
    ├── api.js              # tiny fetch wrapper for /api/*
    ├── session.js          # localStorage-backed display name + initials helper
    ├── format.js           # timeAgo formatter
    └── boardReducer.js     # pure reducer; all board mutations funnel here
```

## Data flow

1. `BoardPage` mounts → `api.getBoard(id)` populates initial state and
   opens a Socket.io connection.
2. On connect, the client emits `join_board` with the display name.
   The server acks with the (possibly newer) board snapshot, which
   replaces local state — making reconnects self-healing.
3. User actions (add card, drag, comment) emit Socket.io events.
   Drag-and-drop additionally updates local state optimistically.
4. The server writes to SQLite and broadcasts the canonical event to
   the room. All clients (including the originator) apply the broadcast
   through `boardReducer`, so optimistic updates converge with the
   server's source of truth without flicker.

## Reducer contract

All board mutations go through `boardReducer.js`:

| Action            | Effect                                              |
| ----------------- | --------------------------------------------------- |
| `set`             | Replace the entire board                            |
| `card_added`      | Append a card to a column                           |
| `card_moved`      | Move a card between columns at a given index        |
| `comment_added`   | Append a comment to a card                          |
| `column_added`    | Append a column (deduped by id)                     |

Keeping mutations centralized makes optimistic UI and server
broadcasts use the same code path, eliminating drift.

## Design system

`src/index.css` defines a small, opinionated design language tuned
for a dark, premium feel:

- **Surface scale** (`--bg-0` → `--bg-3`) tinted subtly violet.
- **Glass panels** (`--glass`, `--glass-hi`) with `backdrop-filter`.
- **Brand gradient** (`--grad-hero`) combining violet → pink → cyan.
- **Motion system** — `--ease`, `--t-fast/med/slow` for consistent transitions.
- **Typography** — Outfit for body/headings, JetBrains Mono for data chips.

Reusable components in CSS:

| Class           | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `.btn`          | Base button; pair with `.btn-primary` / `.btn-ghost` / `.btn-warm` / `.btn-sm` |
| `.card`         | Glass-surfaced container with shadow                       |
| `.chip`         | Small inline tag                                           |
| `.gradient-text`| Apply the brand gradient as a text fill                    |
| `.modal-backdrop` + `.modal` | Centered overlay dialog                        |
| `.user-pill`    | Compact avatar + name display                              |
| `.toast-feed`   | Stacked transient notifications in the corner              |

## Sessions

There is no user authentication. `lib/session.js` persists a chosen
display name in `localStorage` under `retroboard.displayName`. The
`GuestAuthModal` enforces it on every board visit until the value
exists; clearing localStorage resets the prompt.

## Drag-and-drop

`BoardPage` wraps the board in a `DndContext`. Each `Column` registers
as a `useDroppable`, and each `Card` registers as a `useSortable`.
On `onDragEnd`:

1. Resolve the destination column id and target index based on whether
   the drop target was a column (drop at end) or another card.
2. Apply the move optimistically via the reducer.
3. Emit `move_card` to the server. The server repacks positions in
   both the source and destination columns and re-broadcasts.

A `DragOverlay` renders a tilted clone of the card during drag for the
"premium" pick-up feel.

## Accessibility & SEO

- Each interactive element has a stable, descriptive `id`
  (e.g. `create-board-submit`, `column-<id>`, `card-<id>`) which makes
  scripted UI tests trivial.
- `document.title` is updated on both pages, with a meaningful
  `<meta name="description">` in `index.html`.
- All inputs are real `<input>` / `<textarea>` elements with
  proper focus rings derived from `--c-violet-500`.
