# Frontend Documentation

## Tech Stack

- **React 19** with TypeScript
- **Vite** for development and building
- **React Router** for client-side routing
- **Socket.io Client** for real-time WebSocket communication
- **@hello-pangea/dnd** for drag-and-drop card movement

## Pages

### Home Page (`/`)

- Displays all existing boards in a grid layout
- Provides a form to create new boards
- Navigates to the board page on creation

### Board Page (`/board/:id`)

- Prompts for a guest display name on first visit (stored in `sessionStorage`)
- Displays columns with cards in a horizontal scrollable layout
- Supports drag-and-drop of cards between columns
- Provides "Add a card" functionality per column
- "Add Column" button to create new columns
- "Export CSV" button to download board data
- Slide-out comments panel for viewing/adding comments on cards

## Components

### GuestModal

Modal overlay that prompts users for a display name before they can interact with the board. The name is stored in `sessionStorage` under the key `retroGuestName`.

### CommentsPanel

Slide-out panel on the right side that shows comments for a selected card and allows adding new comments. Comments are broadcast in real-time to all connected users.

## Real-Time Updates

The board page connects to the Socket.io server on mount and joins the board's room. All card additions, movements, and comments are reflected instantly across all connected clients. On disconnect, Socket.io automatically attempts reconnection.

## Styling

The app uses a custom dark-theme design system defined in `index.css` with CSS custom properties. Key design features:

- Dark glassmorphism aesthetic
- Gradient accents (purple, pink, teal, amber)
- Smooth micro-animations and transitions
- Responsive layout with horizontal scrolling for columns
- Custom scrollbar styling
