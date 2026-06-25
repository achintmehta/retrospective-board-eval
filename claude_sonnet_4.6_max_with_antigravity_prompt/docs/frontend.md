# RetroBoard Frontend Documentation

The frontend is a React 18 single-page application built with Vite.

## Pages

### Main Page (`/`)

**File**: `client/src/pages/MainPage.jsx`

Displays a hero section, a board creation form, and a grid of all existing boards.

**Key behaviors**:
- Fetches `GET /api/boards` on mount to populate the boards grid
- Submitting the create form calls `POST /api/boards` and navigates to the new board
- Each board card links to `/board/:id`

**Interactive elements** (IDs used for testing):
- `#create-board-form` — the create board form
- `#board-title-input` — text input for board title
- `#create-board-btn` — submit button
- `#board-card-{id}` — individual board cards in the grid

---

### Board Page (`/board/:boardId`)

**File**: `client/src/pages/BoardPage.jsx`

The real-time collaboration page. Displays columns with draggable cards, a guest auth modal, a comment modal, and column/card creation forms.

**Key behaviors**:

#### Guest Authentication
- On first visit to a board, the **auth modal** is shown (`#auth-modal`)
- User enters a display name (`#display-name-input`) and clicks **Join Board** (`#join-board-btn`)
- The name is stored in `sessionStorage` under key `retro_name_{boardId}` and used for all subsequent actions

#### Real-Time Sync
- Connects to the server via Socket.io on mount
- Emits `join_board` with `boardId` and `displayName` after authentication
- Listens for `card_added`, `card_moved`, `comment_added`, `column_added` and updates local React state

#### Columns and Cards
- Columns are rendered in a horizontal scroll container (`#columns-container`)
- Each column has an ID: `#column-{columnId}`
- Cards are rendered inside their column with ID: `#card-{cardId}`
- Dragging a card emits `move_card` via Socket.io and performs an optimistic local update

#### Adding Cards
- Click **"+ Add a card"** button (`#open-add-card-{columnId}`) to expand the card form
- Submit with the button (`#submit-card-btn-{columnId}`) or press **Enter**
- Emits `add_card` via Socket.io

#### Adding Columns
- Click **"+ Column"** button (`#add-column-btn`) in the header to expand the column form (`#add-column-form`)
- Fill in the title (`#new-column-title-input`) and click **Add Column** (`#save-column-btn`)
- Calls `POST /api/boards/:id/columns`

#### Comment Modal
- Click any card to open the comment modal (`#comment-modal`)
- Comments are listed in `#comments-list`
- Add a comment via `#comment-input` and submit via `#submit-comment-btn` or **Enter**
- Emits `add_comment` via Socket.io
- Close the modal with `#close-comment-modal` or clicking the backdrop (`#comment-modal-overlay`)

#### Export CSV
- Click **Export CSV** (`#export-csv-btn`) to open `/api/boards/:id/export` in a new tab, triggering a file download

#### Back Navigation
- Click `#back-home-btn` to navigate back to `/`

---

## Design System

**File**: `client/src/index.css`

The app uses a dark glassmorphism design system with CSS custom properties:

| Variable | Value | Usage |
|----------|-------|-------|
| `--bg-base` | `#08071a` | Page background |
| `--bg-glass` | `rgba(255,255,255,0.04)` | Glass card backgrounds |
| `--purple` | `#7c3aed` | Primary accent |
| `--gradient-primary` | purple → violet → pink | Buttons, titles |
| `--text-primary` | `#f1ecff` | Main text |
| `--text-secondary` | `#9b8cbd` | Subtitles, labels |

**Utility classes**:
- `.btn .btn-primary` — gradient primary button
- `.btn .btn-ghost` — ghost button with glass background
- `.btn .btn-sm` — smaller button variant
- `.btn .btn-icon` — square icon button
- `.glass` — glassmorphism background with backdrop blur
- `.modal-overlay` — full-screen modal backdrop
- `.modal-box` — modal content container
- `.animate-in` — fade-in-up entrance animation
- `.gradient-text` — gradient foreground text
- `.badge` — small pill label
- `.spinner` — loading spinner

## State Management

State is managed locally with React `useState` and `useRef`. There is no global state library.

The most important state in `BoardPage`:
- `board` — full board data fetched from `/api/boards/:id`, updated in real-time by socket events
- `displayName` — persisted in `sessionStorage` per board
- `selectedCardId` — ID of the card whose comment modal is open (selected card is derived from `board`)
- `cardInputs` — map of `{ columnId: inputText }` for the per-column card forms
- `activeCardInput` — the `columnId` whose card input form is currently expanded

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18 | UI library |
| `react-dom` | 18 | DOM rendering |
| `react-router-dom` | v6 | Client-side routing |
| `socket.io-client` | v4 | WebSocket connection |
| `@hello-pangea/dnd` | latest | Drag-and-drop for cards |
| `vite` | 8 | Build tool and dev server |
