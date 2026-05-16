# Frontend Documentation

## Tech Stack

- **React 19** with **Vite 6** for fast development and builds
- **React Router DOM** for client-side routing
- **Socket.io Client** for real-time communication
- Plain CSS for styling (no CSS framework)

## Pages

### Home Page (`/`)

Displays a list of all boards and a form to create new boards. Fetches the board list from the API on mount.

### Board Page (`/board/:id`)

The main collaborative view. Requires a display name before interaction (stored in localStorage). Features:

- **Board Header**: Board title, current user's display name, and export button
- **Column Management**: Add new columns via the input below the header
- **Card Management**: Add cards to columns, drag-and-drop cards between columns
- **Comments**: Toggle comments on each card, add replies
- **Real-time Updates**: All changes are broadcast to connected clients via Socket.io
- **CSV Export**: Download the entire board as a CSV file

## State Management

The board page fetches initial state from the REST API and then patches local state based on Socket.io broadcast events. On reconnection, the full board state is refetched to ensure consistency.

## Drag and Drop

Uses the native HTML5 Drag and Drop API (no external library). When a card is dropped, the `move_card` Socket event is emitted to update the server and broadcast to other clients.
