# Frontend Documentation

## Structure

```
client/src/
├── main.jsx              # Entry point with BrowserRouter
├── App.jsx               # Route definitions
├── index.css             # Global styles and dark theme variables
├── App.css               # Keyframe animations
├── pages/
│   ├── HomePage.jsx      # Board listing and creation
│   └── BoardPage.jsx     # Board view with real-time collaboration
└── components/
    ├── GuestModal.jsx    # Display name prompt on board entry
    ├── CardItem.jsx      # Individual card rendering
    ├── CommentPanel.jsx  # Slide-over panel for card comments
    └── AddColumnForm.jsx # Inline form to add columns
```

## Pages

### HomePage (`/`)

Displays all existing boards and a form to create new ones. On board creation, navigates to the new board page.

### BoardPage (`/board/:id`)

The main collaboration surface. Features:

- **Guest authentication** — Prompts for a display name via `GuestModal` (stored in `sessionStorage`)
- **Column display** — Each column has a color accent, card count badge, and inline card input
- **Drag-and-drop** — Uses `@hello-pangea/dnd` to move cards between columns; emits `move_card` via Socket.io
- **Real-time sync** — Listens for `card_added`, `card_moved`, `comment_added`, and `column_added` events
- **Comments** — Click any card to open `CommentPanel`, a slide-over drawer
- **CSV export** — Opens `/api/boards/:id/export` in a new tab

## Styling

All styles use inline JavaScript objects for zero-config styling. The dark theme uses CSS custom properties defined in `index.css`. Typography is Inter via Google Fonts.
