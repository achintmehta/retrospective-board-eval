# Frontend Documentation

## Stack
- React
- Vite
- React Router DOM
- Socket.io Client
- @hello-pangea/dnd (for Drag and Drop)

## Architecture

### Pages
1. **Home (`/`)**: Displays all recently created boards and provides a form to create a new one. Upon board creation, default columns are automatically added.
2. **Board (`/boards/:id`)**: The main collaborative workspace. Requires a display name (Guest Auth) before entering.

### State Management
- Local React state (`useState`, `useEffect`) is used to store columns, cards, and comments.
- Socket.io is used for real-time syncing.
- Optimistic UI updates are performed during Drag and Drop to ensure the UI feels responsive before the server broadcast returns.

### Realtime Sync
When a user joins a board, they fetch the full state via the REST API, then join a Socket.io room specific to that board ID. All actions (adding/moving cards, commenting) emit events to the server, which broadcast the state changes back to all users in the room.
