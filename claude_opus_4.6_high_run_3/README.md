# Retrospective Board

A real-time collaborative retrospective board application. Teams can create boards, add cards to columns, drag and drop cards between columns, and add comments — all synchronized instantly across all connected clients via WebSockets.

## Features

- Create and manage retrospective boards
- Configurable columns (e.g., "Went Well", "Needs Improvement", "Action Items")
- Real-time card creation and movement via drag-and-drop
- Nested comments on cards
- Guest authentication with display names
- Export board data to CSV
- Single-container Docker deployment
- SQLite storage (zero external dependencies)

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Start both backend and frontend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### Production

```bash
# Build the frontend
npm run build

# Start the server (serves both API and static frontend)
npm start
```

The application will be available at http://localhost:3001.

### Docker

```bash
# Build the image
docker build -t retro-board .

# Run the container (volume persists the SQLite database)
docker run -p 3001:3001 -v retro-data:/data retro-board
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3001`  | Server port |

## Project Structure

```
├── server/
│   ├── index.js          # Express server entry point
│   ├── db.js             # SQLite database setup and queries
│   ├── socket.js         # Socket.io event handlers
│   └── routes/
│       └── boards.js     # REST API routes
├── client/
│   ├── src/
│   │   ├── main.jsx      # React entry point with router
│   │   ├── App.jsx       # Route definitions
│   │   ├── pages/
│   │   │   ├── HomePage.jsx   # Board list and creation
│   │   │   └── BoardPage.jsx  # Board view with real-time collaboration
│   │   └── components/
│   │       ├── GuestModal.jsx  # Display name prompt
│   │       ├── Column.jsx      # Board column with drag-and-drop
│   │       └── CardDetail.jsx  # Card detail modal with comments
│   └── index.html
├── Dockerfile
└── package.json
```
