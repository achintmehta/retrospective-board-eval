# Retro Board

A real-time retrospective board application. Multiple users can collaborate on boards simultaneously with instant updates via WebSockets.

## Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React (Vite)
- **Database**: SQLite (via `better-sqlite3`)

## Running Locally

### Prerequisites

- Node.js 18+ and npm

### Install dependencies

```bash
npm run install:all
```

This installs both backend and frontend dependencies.

### Start development servers

```bash
npm run dev
```

This starts:
- Backend API + Socket.io server on **http://localhost:3001**
- Frontend Vite dev server on **http://localhost:5173**

Open **http://localhost:5173** in your browser.

### Production build

```bash
npm run build
npm start
```

The backend will serve the built frontend at **http://localhost:3001**.

## Docker

Build and run in a single container:

```bash
docker build -t retro-board .
docker run -p 3001:3001 -v retro-data:/data retro-board
```

Open **http://localhost:3001** in your browser.

The `-v retro-data:/data` flag persists the SQLite database across container restarts.

## Usage

1. Open the app in your browser.
2. Create a new board by entering a name and clicking **Create Board**.
3. On the board page, enter a display name to join.
4. Add columns (e.g., "Went Well", "Needs Improvement", "Action Items").
5. Add cards to columns by clicking **+ Add card**.
6. Click a card to view and add comments.
7. Drag cards between columns to reorganize.
8. Click **Export CSV** to download the board data.

Share the board URL with teammates — all changes appear in real time.

## API

See [docs/api.md](docs/api.md) for the REST API reference.

## Frontend Architecture

See [docs/frontend.md](docs/frontend.md) for the frontend component overview.
