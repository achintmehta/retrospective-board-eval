# Frontend Documentation

## Technology Stack

- **React 19** — UI framework
- **Vite** — Build tool and dev server
- **React Router** — Client-side routing
- **Socket.io Client** — Real-time WebSocket communication
- **@hello-pangea/dnd** — Drag-and-drop for card movement

## Project Structure

```
client/
├── index.html          # Entry HTML
├── vite.config.js      # Vite config with API proxy
├── src/
│   ├── main.jsx        # React entry point
│   ├── App.jsx         # Router setup
│   ├── index.css       # Design system & global styles
│   ├── pages/
│   │   ├── HomePage.jsx    # Board listing and creation
│   │   ├── HomePage.css
│   │   ├── BoardPage.jsx   # Board view with real-time collaboration
│   │   └── BoardPage.css
│   └── components/
│       ├── GuestModal.jsx      # Display name prompt
│       ├── GuestModal.css
│       ├── CardModal.jsx       # Card detail view with comments
│       ├── CardModal.css
│       ├── AddColumnForm.jsx   # Column creation form
│       └── AddColumnForm.css
```

## Pages

### HomePage (`/`)

Displays all existing boards and a form to create a new one. Creating a board navigates to the board page automatically.

### BoardPage (`/board/:id`)

The main collaborative view. Features:

- **Guest Authentication**: On first visit, a modal prompts for a display name (stored in `sessionStorage`).
- **Columns**: Displayed horizontally with color-coded headers. New columns can be added via the form at the end.
- **Cards**: Displayed within columns. Users can add cards via the "Add Card" button at the bottom of each column.
- **Drag and Drop**: Cards can be dragged between columns using `@hello-pangea/dnd`. Optimistic UI updates are applied immediately, with the server syncing via Socket.io.
- **Comments**: Clicking a card opens a modal showing its content and threaded comments.
- **Export**: "Export CSV" button in the header triggers a file download.

## Real-Time Architecture

1. On mount, the BoardPage connects to Socket.io and joins the board's room.
2. User actions (add card, move card, add comment) emit events to the server.
3. The server persists changes to SQLite, then broadcasts to all clients in the room.
4. All clients receive the broadcast and update their local state.

## Design System

The app uses a dark theme with glassmorphism effects. Key design tokens are defined as CSS custom properties in `index.css`:

- **Colors**: Purple accent gradient (`--accent-primary`, `--accent-gradient`)
- **Typography**: Inter font family via Google Fonts
- **Effects**: Glass card backgrounds, glow shadows, subtle animations
- **Responsive**: Mobile-friendly with breakpoints at 600px and 768px
