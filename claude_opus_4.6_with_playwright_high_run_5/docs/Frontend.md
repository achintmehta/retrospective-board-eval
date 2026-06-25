# Frontend Documentation

The frontend is a React application built with Vite, located in the `client/` directory.

## Pages

### Main Page (`/`)
- Displays all existing boards
- Form to create a new board
- Clicking a board navigates to its board page

### Board Page (`/board/:id`)
- Prompts for a display name on first visit (stored in sessionStorage)
- Shows board columns with cards
- Supports drag-and-drop between columns via `@hello-pangea/dnd`
- Real-time updates via Socket.io
- Add columns, cards, and comments
- Export board to CSV

## Key Dependencies

- `react-router-dom` - Client-side routing
- `socket.io-client` - Real-time communication
- `@hello-pangea/dnd` - Drag and drop

## Development

```bash
cd client
npm install
npm run dev
```

The dev server runs on port 5173 and proxies `/api` and `/socket.io` requests to the backend on port 3001.
