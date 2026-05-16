# Frontend Documentation

## Overview

The frontend is a **React + TypeScript + Vite** application with a dark-mode design system. It communicates with the backend via REST API for initial data loading and Socket.io for real-time collaboration.

## Pages

### Main Page (`/`)

**File:** `client/src/pages/MainPage.tsx`

Displays a grid of existing boards and a form to create new ones.

**Key behavior:**
- Fetches boards from `GET /api/boards` on mount
- The "Create Board" form lets users enter a title and customize columns (add/remove)
- Submits to `POST /api/boards` and navigates to the new board's URL on success
- Shows an empty state when no boards exist

**Form fields:**
| Field | ID | Notes |
|-------|----|-------|
| Board name | `#board-title` | Required |
| Column input | `#column-input` | Press Enter or "Add" button |
| Add column btn | `#add-column-btn` | Adds tag to column list |
| Submit | `#create-board-submit` | Disabled until title + columns filled |

---

### Board Page (`/board/:boardId`)

**File:** `client/src/pages/BoardPage.tsx`

The main collaboration interface. Shows columns with draggable cards.

**Features:**
- **Guest auth** — Shows `AuthModal` if no name is stored in `sessionStorage`
- **Real-time sync** — Socket.io connection with room-based events
- **Drag-and-drop** — @hello-pangea/dnd library handles card movement
- **Optimistic updates** — Card moves update UI immediately before server confirmation
- **Comment drawer** — Clicking any card opens `CommentDrawer` 
- **Add column** — Inline form to add columns to the board
- **Export** — Clicking "⬇ Export CSV" triggers `GET /api/boards/:id/export`

**Key element IDs:**
| Element | ID |
|---------|----|
| User badge | `#user-badge` |
| Export button | `#export-csv-btn` |
| Add card button (per column) | `#add-card-btn-{columnId}` |
| Card input (per column) | `#card-input-{columnId}` |
| Submit card (per column) | `#add-card-submit-{columnId}` |
| Card element | `#card-{cardId}` |
| Add column button | `#add-column-card-btn` |
| New column input | `#new-column-input` |
| Submit column | `#add-column-submit-btn` |

---

## Components

### `AuthModal`

**File:** `client/src/components/AuthModal.tsx`

A full-screen overlay modal that prompts the user for a display name.

**Props:**
```typescript
interface Props {
  boardTitle: string;
  onSubmit: (name: string) => void;
}
```

On submit, the name is stored in `sessionStorage` under `retro_user_name` and the modal closes.

**Key IDs:**
| Element | ID |
|---------|----|
| Name input | `#display-name-input` |
| Submit button | `#join-board-btn` |

---

### `CommentDrawer`

**File:** `client/src/components/CommentDrawer.tsx`

A slide-in drawer from the right that shows a card's details and comments.

**Props:**
```typescript
interface Props {
  card: Card;
  onClose: () => void;
  onAddComment: (content: string) => void;
}
```

**Keyboard shortcuts:**
- `Escape` — Close the drawer
- `Ctrl+Enter` (or `Cmd+Enter`) — Submit comment

**Key IDs:**
| Element | ID |
|---------|----|
| Comment textarea | `#comment-textarea` |
| Submit comment | `#submit-comment-btn` |
| Close button | `#close-drawer-btn` |

---

## State Management

State is managed locally with React `useState` — no external state library (Redux, Zustand, etc.) is used.

**Board page state:**
| State | Purpose |
|-------|---------|
| `board` | Full board data (columns + cards + comments) |
| `userName` | Current user's display name |
| `connected` | Socket.io connection status |
| `selectedCard` | Card open in comment drawer (null if closed) |
| `addingCardCol` | ID of column currently adding a card to |
| `addingColumn` | Whether the add-column form is visible |

**Real-time updates** patch the `board` state immutably via `setBoard(prev => ...)`.

---

## Real-Time Architecture

```
Client A                  Server                  Client B
   |                         |                         |
   |--emit add_card--------->|                         |
   |                         |--save to SQLite         |
   |                         |--broadcast card_added-->|
   |<--receive card_added----|                         |
   |                         |                         |
```

The server is the **source of truth**. Clients send events and receive broadcasts. On reconnect, the client re-fetches the full board state from `GET /api/boards/:id`.

---

## Styling

**File:** `client/src/index.css`

The design system uses CSS custom properties (variables) for theming:

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-base` | `#0d1117` | Page background |
| `--bg-surface` | `#161b22` | Cards, panels |
| `--bg-elevated` | `#21262d` | Input backgrounds |
| `--accent-primary` | `#58a6ff` | CTA buttons, links |
| `--accent-purple` | `#bc8cff` | Gradient accents |
| `--text-primary` | `#e6edf3` | Main text |
| `--text-secondary` | `#8b949e` | Captions, meta |

Column headers use an array of 6 accent colors cycling by column index.

---

## Build

```bash
# Development
npm run dev:client     # Vite dev server on :5173

# Production
npm run build:client   # Outputs to client/dist/
```

The production build is served as static files by Express in the backend.
