# Antigravity Retro Board

A real-time, self-hosted retrospective board for modern teams. Built with React, Node.js, Socket.io, and SQLite.

## Features

- **Real-time Collaboration**: Instant updates for adding cards, moving cards, and commenting.
- **Drag and Drop**: Smooth card movement between columns.
- **Guest Sessions**: Join instantly by entering a display name.
- **Persistent Storage**: Uses SQLite for simple, file-based data persistence.
- **CSV Export**: Download your board data for archiving or analysis.
- **Docker Ready**: Single container deployment for zero-setup hosting.

## Tech Stack

- **Frontend**: React, Vite, Socket.io-client, @hello-pangea/dnd, Lucide React, Axios.
- **Backend**: Node.js, Express, Socket.io, SQLite3, CORS.
- **Deployment**: Docker.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Local Development

1. **Clone the repository**
2. **Install all dependencies**:
   ```bash
   npm install && cd server && npm install && cd ../client && npm install
   ```
3. **Run both Backend and Frontend**:
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build the Image**:
   ```bash
   docker build -t retro-board .
   ```
2. **Run the Container**:
   ```bash
   docker run -p 3000:3000 -v retro_data:/app/server/data retro-board
   ```

## API Documentation

### REST Endpoints

- `GET /api/boards`: Fetch all boards.
- `POST /api/boards`: Create a new board.
- `GET /api/boards/:id`: Fetch a specific board.
- `POST /api/boards/:id/columns`: Create a new column.
- `GET /api/boards/:id/export`: Download board data as CSV.

## License

ISC
