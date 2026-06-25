## Why

Teams need a simple, self-hosted, real-time platform to conduct retrospectives without relying on external SaaS solutions that might have privacy or cost concerns. Building a real-time retrospective board that can run locally or as a self-contained Docker image solves this by providing a zero-setup, collaborative environment.

## What Changes

- Introduce a new web application with a Node.js backend and a React frontend (via Vite).
- Implement a main page to view and create retrospective boards.
- Implement a board page featuring configurable columns (e.g., "Went Well", "Needs Improvement").
- Enable users to create cards in columns and add nested comments to cards.
- Add real-time synchronization using WebSockets (Socket.io) to broadcast card additions, movements, and comments to all connected clients instantly.
- Implement guest session authentication where users simply enter a display name to join.
- Add functionality to export a board's entire contents as a CSV file.
- Use SQLite as the database to ensure trivial setup and single-container Docker deployment.
- Single npm command `npm run dev` to start both the backend and frontend.

## Capabilities

### New Capabilities
- `board-management`: Creating boards, viewing the list of boards, and defining configurable columns.
- `collaboration`: Managing cards, adding nested comments, and synchronizing state across clients in real-time.
- `export`: Exporting board data to CSV format.

### Modified Capabilities
- None

## Impact

This will create an entirely new full-stack application within the workspace, establishing the foundation for real-time WebSocket communication and SQLite storage. It introduces dependencies like React, Vite, Express, Socket.io, and a SQLite driver.
