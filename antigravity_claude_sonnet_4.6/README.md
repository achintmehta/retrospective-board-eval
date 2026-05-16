# RetroBoard — Real-Time Retrospective Board

A self-hosted, real-time retrospective board application for agile teams. No signup required — just enter your name and start collaborating.

## Features

- 📋 **Multiple boards** — Create and manage separate boards for each sprint/team
- 🏃 **Guest sessions** — Enter a display name to join, no account needed
- ⚡ **Real-time collaboration** — Changes sync instantly via WebSockets
- 🃏 **Drag & drop cards** — Move cards between columns with smooth DnD
- 💬 **Nested comments** — Add threaded comments to any card
- ➕ **Custom columns** — Create any columns you need (not just the defaults)
- 📤 **CSV export** — Download the full board as a CSV file
- 🐳 **Docker-ready** — Single container, single command deployment

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express + TypeScript |
| Real-time | Socket.io |
| Database | SQLite (via sql.js — no native compilation) |
| Frontend | React + Vite + TypeScript |
| Styling | Vanilla CSS (dark mode) |
| DnD | @hello-pangea/dnd |
| Container | Docker (multi-stage build) |

## Quick Start (Local Dev)

### Prerequisites

- Node.js 18+ 
- npm 8+

### 1. Install dependencies

```bash
# Root (backend)
npm install

# Frontend
cd client && npm install && cd ..
```

### 2. Run in development mode

```bash
npm run dev
```

This starts:
- **Backend** on `http://localhost:3001` (with hot-reload via ts-node-dev)
- **Frontend** on `http://localhost:5173` (with Vite, proxied to backend)

Open `http://localhost:5173` in your browser.

## Running with Docker

### Build the image

```bash
docker build -t retroboard .
```

### Run the container

```bash
docker run -p 3001:3001 -v retro-data:/data retroboard
```

Open `http://localhost:3001` in your browser.

> [!IMPORTANT]
> **The `-v retro-data:/data` volume flag is required for data persistence.**
> The SQLite database file is stored at `/data/retro.sqlite` inside the container.
> If you omit the volume mount, all board data will be lost every time the container is stopped or restarted.

#### Why the volume mount matters

| Command | Data survives restart? |
|---------|----------------------|
| `docker run -p 3001:3001 -v retro-data:/data retroboard` | ✅ Yes — data written to the named volume `retro-data` |
| `docker run -p 3001:3001 retroboard` | ❌ No — data lives only in the ephemeral container layer |

#### Using a host directory instead of a named volume

If you prefer to store the database at a specific path on your host machine:

```bash
# Linux / macOS
docker run -p 3001:3001 -v /path/to/data:/data retroboard

# Windows (PowerShell)
docker run -p 3001:3001 -v C:\path\to\data:/data retroboard
```

#### Inspecting or backing up the database

```bash
# List the named volume
docker volume inspect retro-data

# Copy the database file out of the volume
docker run --rm -v retro-data:/data -v $(pwd):/backup alpine \
  cp /data/retro.sqlite /backup/retro-backup.sqlite
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Port the server listens on |
| `DB_PATH` | `./retro.sqlite` | Path to the SQLite database file |
| `NODE_ENV` | `development` | Set to `production` for prod builds |

## Project Structure

```
.
├── src/                    # Backend source
│   ├── server.ts          # Express + Socket.io server
│   ├── routes.ts          # REST API routes
│   └── db.ts              # SQLite database module
├── client/                 # Frontend source (React + Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── index.css       # Global styles
│   │   ├── types.ts        # Shared TypeScript types
│   │   ├── pages/
│   │   │   ├── MainPage.tsx
│   │   │   └── BoardPage.tsx
│   │   └── components/
│   │       ├── AuthModal.tsx
│   │       └── CommentDrawer.tsx
│   └── vite.config.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Usage Guide

### Creating a Board

1. Navigate to the home page (`/`)
2. Enter a board name (e.g., "Sprint 12 Retro")
3. Customize the columns or use the defaults: *Went Well*, *Needs Improvement*, *Action Items*
4. Click **✨ Create Board** — you'll be taken to the board immediately

### Joining a Board

1. Open the board URL (share it with your team)
2. Enter your display name in the modal
3. Start adding cards!

### Adding Cards

- Click **+ Add Card** at the bottom of any column
- Type your thought and press **Enter** or click **Add Card**
- Your card appears instantly for all connected users

### Moving Cards

- Drag any card and drop it into a different column
- The move syncs to all connected clients in real-time

### Commenting

- Click any card to open the comment drawer
- Type your comment and click **💬 Post Comment** (or Ctrl+Enter)
- Comments are visible to all connected users

### Exporting

- Click **⬇ Export CSV** in the board header
- Downloads a CSV with all columns, cards, and comments
