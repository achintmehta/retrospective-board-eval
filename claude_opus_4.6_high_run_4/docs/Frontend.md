# Frontend Documentation

## Tech Stack

- **React** with Vite for fast development and builds
- **React Router** for client-side navigation
- **Socket.io Client** for real-time WebSocket communication
- **@hello-pangea/dnd** for drag-and-drop card movement

## Pages

### Main Page (`/`)
- Lists all existing retrospective boards sorted by creation date
- Provides a form to create a new board
- Clicking a board navigates to its board page

### Board Page (`/board/:id`)
- Requires guest authentication (display name prompt)
- Displays columns with draggable cards
- Supports adding new columns and cards
- Cards can be clicked to view/add comments in a modal
- Drag-and-drop cards between columns
- Export board data as CSV

## State Management

- Board state is managed locally via React `useState`
- Real-time updates arrive via Socket.io events and are merged into local state
- Display name is stored in `sessionStorage` for the browser session

## Development

The Vite dev server proxies `/api` and `/socket.io` requests to the Express backend at `http://localhost:3001`, configured in `vite.config.js`.
