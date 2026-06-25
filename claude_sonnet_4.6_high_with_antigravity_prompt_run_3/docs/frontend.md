# Frontend Documentation

Built with React + Vite. Located in the `client/` directory.

## Stack

- **React 18** with hooks
- **React Router v6** for client-side routing
- **@hello-pangea/dnd** for drag-and-drop
- **socket.io-client** for real-time communication
- **Vanilla CSS** (dark mode design system in `src/index.css`)

## Pages

### MainPage (`/`)
- Displays all boards sorted by creation date
- "Create Board" form with customizable column names
- Fetches boards from `GET /api/boards`
- Navigates to `/board/:id` after creation

### BoardPage (`/board/:id`)
- Prompts for display name (stored in `sessionStorage`) if not set
- Fetches full board from `GET /api/boards/:id`
- Connects to Socket.io and joins the board room
- Renders columns with `Column` components inside a `DragDropContext`
- Handles real-time events: `card_added`, `card_moved`, `comment_added`, `column_added`
- Export triggers `GET /api/boards/:id/export` download

## Components

### `GuestAuthModal`
Simple modal asking for a display name. Saved to `sessionStorage` so it persists across refreshes.

### `Column`
- Renders a droppable area (`Droppable` from dnd)
- Contains a list of `Card` components
- Has an inline "Add card" form at the bottom
- Shows card count badge

### `Card`
- Draggable item (`Draggable` from dnd)
- Displays content, author avatar (initials), and comment count
- Click on comment button opens the `CommentDrawer` (managed by `BoardPage`)

## Real-time Flow

1. User emits an event (e.g., `add_card`) via Socket.io
2. Server saves to SQLite and broadcasts to the board room
3. All clients (including sender) receive `card_added` and update local state

## Design System

CSS custom properties defined in `src/index.css`:
- Dark theme: `--bg-primary`, `--bg-secondary`, `--bg-card`
- Accent: `--accent-purple`, `--accent-blue`, `--gradient-primary`
- Typography: `Inter` from Google Fonts
- Smooth transitions via `--transition` variable
