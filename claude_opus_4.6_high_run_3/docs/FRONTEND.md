# Frontend Documentation

The frontend is a React application bootstrapped with Vite, located in the `client/` directory.

## Tech Stack

- **React 19** — UI framework
- **React Router** — Client-side routing
- **Socket.io Client** — Real-time WebSocket communication
- **@hello-pangea/dnd** — Drag-and-drop for card movement

## Pages

### Home Page (`/`)

Displays a list of all retrospective boards and a form to create new ones. Creating a board navigates directly to it.

### Board Page (`/board/:id`)

The main collaboration view. Features:

- **Guest Auth Modal**: Prompts for a display name on first visit (stored in `sessionStorage`)
- **Column Management**: Add columns via the header form
- **Cards**: Add cards to columns via "Add Card" button; drag cards between columns
- **Comments**: Click any card to open the detail modal and add comments
- **Export**: "Export CSV" button downloads board data
- **Real-Time Sync**: All changes broadcast to connected clients via Socket.io

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `GuestModal` | `components/GuestModal.jsx` | Display name entry modal |
| `Column` | `components/Column.jsx` | Renders a board column with its cards and drag-and-drop zones |
| `CardDetail` | `components/CardDetail.jsx` | Card detail overlay with comment thread |

## Development

```bash
cd client
npm install
npm run dev
```

The Vite dev server runs on port 5173 and proxies API requests to the backend on port 3001.
