# Frontend Documentation

## Architecture

The frontend is a React 19 single-page application built with Vite and TypeScript.

## Pages

### Main Page (`/`)
- Displays all existing retrospective boards
- Provides a form to create new boards
- Clicking a board navigates to the board page

### Board Page (`/board/:id`)
- Shows the board with its columns and cards
- Prompts for a display name on first visit (stored in sessionStorage)
- Real-time updates via Socket.io

## Components

| Component | Description |
|-----------|-------------|
| `Column` | Renders a board column with its cards and add-card form. Acts as a droppable zone. |
| `CardItem` | Renders an individual card. Draggable via dnd-kit. Shows comment count. |
| `GuestAuthModal` | Modal overlay prompting for display name. |
| `CommentsPanel` | Slide-in panel for viewing and adding comments to a card. |
| `AddColumnForm` | Inline form for adding new columns to the board. |

## Real-Time

The Board Page connects to the backend via Socket.io on mount. It joins the board's room and listens for `card_added`, `card_moved`, `comment_added`, and `column_added` events to keep the UI in sync across all clients.

## Drag and Drop

Card drag-and-drop is implemented using `@dnd-kit/core`. Cards are draggable and columns are droppable zones. On drop, a `move_card` event is emitted via Socket.io and the local state is optimistically updated.

## Styling

Vanilla CSS with CSS custom properties for theming. Dark mode design with glassmorphism effects, gradient accents, and smooth animations. Uses the Inter font from Google Fonts.
