## 1. Project Initialization

- [ ] 1.1 Initialize Node.js backend project and install core dependencies (express, socket.io, sqlite3, cors)
- [ ] 1.2 Initialize Vite + React for the frontend inside a `client` directory
- [ ] 1.3 Setup Dockerfile to serve both backend and static frontend from a single container

## 2. Database Setup

- [ ] 2.1 Set up SQLite connection and database file
- [ ] 2.2 Create schema for `boards`, `board_columns`, `cards`, and `comments` tables
- [ ] 2.3 Write utility functions to query and mutate data in SQLite

## 3. Core API

- [ ] 3.1 Implement REST endpoint to create a new board
- [ ] 3.2 Implement REST endpoint to fetch all boards
- [ ] 3.3 Implement REST endpoint to fetch a specific board with its columns, cards, and comments
- [ ] 3.4 Implement REST endpoint to create board columns

## 4. Frontend Foundation

- [ ] 4.1 Setup React Router for navigation
- [ ] 4.2 Create Main Page: Display list of boards and a "Create Board" form
- [ ] 4.3 Create Board Page Shell: Fetch and display board data
- [ ] 4.4 Implement Guest Auth modal prompting for a display name on the Board Page

## 5. Real-Time Collaboration (Backend)

- [ ] 5.1 Initialize Socket.io on the Express server
- [ ] 5.2 Implement room-joining logic for boards
- [ ] 5.3 Handle `add_card` event: save to DB and broadcast `card_added`
- [ ] 5.4 Handle `move_card` event: update DB position and broadcast `card_moved`
- [ ] 5.5 Handle `add_comment` event: save to DB and broadcast `comment_added`

## 6. Real-Time Collaboration (Frontend)

- [ ] 6.1 Integrate `socket.io-client` on the Board Page
- [ ] 6.2 Render columns and cards
- [ ] 6.3 Implement drag-and-drop for moving cards between columns
- [ ] 6.4 Implement UI for adding new cards to columns
- [ ] 6.5 Implement UI for viewing and adding comments to cards

## 7. Export Functionality

- [ ] 7.1 Implement backend REST endpoint `/api/boards/:id/export` to generate and stream CSV data
- [ ] 7.2 Add "Export to CSV" button on the Board Page UI

## 8. Documentation

- [ ] 8.1 Create README.md with instructions on how to run the application
- [ ] 8.2 Create documentation for the API
- [ ] 8.3 Create documentation for the frontend
