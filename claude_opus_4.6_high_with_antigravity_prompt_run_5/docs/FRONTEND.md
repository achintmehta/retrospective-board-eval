# Frontend Documentation

The frontend is a React single-page application built with Vite.

## Tech Stack

- **React 19** — UI framework
- **React Router v7** — client-side routing
- **Socket.io Client** — real-time WebSocket communication
- **@hello-pangea/dnd** — drag-and-drop for card movement
- **Vite** — build tool and dev server

## Pages

### Home Page (`/`)
- Lists all existing boards as clickable cards
- Provides a form to create a new board
- On board creation, navigates to the new board page

### Board Page (`/board/:id`)
- Displays a guest auth modal on first visit (display name stored in sessionStorage)
- Shows all columns with their cards
- Supports adding new columns
- Supports adding cards to columns via an inline form
- Drag-and-drop cards between columns
- View and add comments on cards
- Export board to CSV
- Real-time sync: all changes broadcast to connected clients

## Components

### `GuestModal`
Prompts the user for a display name before they can interact with a board. The name is stored in `sessionStorage` under the key `retro_display_name`.

### `CardItem`
Renders a single card with its content, author, and an expandable comments section. Supports adding new comments inline.

## Development

```bash
cd client
npm install
npm run dev
```

The Vite dev server runs on port 5173 and proxies `/api` and `/socket.io` requests to the backend on port 3000.

## Build

```bash
cd client
npm run build
```

Output goes to `client/dist/`, which the Express server serves as static files in production.
