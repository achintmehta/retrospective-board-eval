## 1. Project Initialization

- [x] 1.1 Initialize Node.js backend project and install core dependencies (express, socket.io, sqlite3, cors)
- [x] 1.2 Initialize Vite + React for the frontend inside a `client` directory
- [x] 1.3 Setup Dockerfile to serve both backend and static frontend from a single container

## 2. Database Setup

- [x] 2.1 Set up SQLite connection and database file
- [x] 2.2 Create schema for `boards`, `board_columns`, `cards`, and `comments` tables
- [x] 2.3 Write utility functions to query and mutate data in SQLite

## 3. Core API

- [x] 3.1 Implement REST endpoint to create a new board
- [x] 3.2 Implement REST endpoint to fetch all boards
- [x] 3.3 Implement REST endpoint to fetch a specific board with its columns, cards, and comments
- [x] 3.4 Implement REST endpoint to create board columns

## 4. Frontend Foundation

- [x] 4.1 Setup React Router for navigation
- [x] 4.2 Create Main Page: Display list of boards and a "Create Board" form
- [x] 4.3 Create Board Page Shell: Fetch and display board data
- [x] 4.4 Implement Guest Auth modal prompting for a display name on the Board Page

## 5. Real-Time Collaboration (Backend)

- [x] 5.1 Initialize Socket.io on the Express server
- [x] 5.2 Implement room-joining logic for boards
- [x] 5.3 Handle `add_card` event: save to DB and broadcast `card_added`
- [x] 5.4 Handle `move_card` event: update DB position and broadcast `card_moved`
- [x] 5.5 Handle `add_comment` event: save to DB and broadcast `comment_added`

## 6. Real-Time Collaboration (Frontend)

- [x] 6.1 Integrate `socket.io-client` on the Board Page
- [x] 6.2 Render columns and cards
- [x] 6.3 Implement drag-and-drop for moving cards between columns
- [x] 6.4 Implement UI for adding new cards to columns
- [x] 6.5 Implement UI for viewing and adding comments to cards

## 7. Export Functionality

- [x] 7.1 Implement backend REST endpoint `/api/boards/:id/export` to generate and stream CSV data
- [x] 7.2 Add "Export to CSV" button on the Board Page UI

## 8. Documentation

- [x] 8.1 Create README.md with instructions on how to run the application
- [x] 8.2 Create documentation for the API
- [x] 8.3 Create documentation for the frontend

---

### Implementation Notes

- **SQLite driver:** The Node.js 22.5+ built-in `node:sqlite` module is used in
  place of the `sqlite3` npm package. This removes the C++ toolchain
  requirement (better-sqlite3 / sqlite3 both need native builds) and keeps
  the install zero-friction across Windows, macOS, and Linux. The Dockerfile
  uses `node:22-bookworm-slim` to match.
- **DnD:** `@hello-pangea/dnd` (the maintained fork of `react-beautiful-dnd`).
- **Single-port production:** `npm run build` produces `client/dist`, and
  `npm start` serves both the React bundle and the `/api` + `/socket.io`
  routes on port 3001. The Vite dev server proxies these paths in dev.
- **Smoke test:** `node scripts/smoke-socket.js` boots the server in-process
  with two Socket.io clients and exercises join → add_card → move_card →
  add_comment → REST refetch → CSV export. Use it to verify the realtime
  pipeline end-to-end without a browser.
