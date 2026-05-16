# Realtime Retro Board - Frontend

## Technology Stack

- React 18
- Vite 5
- TypeScript
- Socket.io-client
- CSS (inline styles for simplicity)

## Project Structure

```
client/
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
└── src/
    ├── main.tsx            # React entry point
    ├── App.tsx             # Main app component with routing
    └── pages/
        ├── MainPage.tsx    # Board list and creation page
        └── BoardPage.tsx   # Individual board view with columns
```

## Features

### Navigation

- `/` - Main page showing all boards
- `/board/:id` - View a specific board

### Components

#### MainPage

Displays a list of existing boards and allows creating new ones.

#### BoardPage

Shows the board with columns and cards. Supports:
- Adding new columns
- Adding new cards
- Real-time updates via WebSocket

## Development

```bash
# Run frontend in development mode
npm run dev:frontend

# Build for production
npm run build
```
