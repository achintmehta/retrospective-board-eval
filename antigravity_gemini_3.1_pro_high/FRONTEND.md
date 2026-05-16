# Frontend Documentation

The frontend is a React application built with Vite, TypeScript, and React Router.

## Structure
- `src/pages/MainPage.tsx`: The home page showing recent boards and the "Create Board" form.
- `src/pages/BoardPage.tsx`: The interactive retrospective board. Connects to Socket.io for real-time collaboration.
- `src/components/GuestAuthModal.tsx`: A modal prompting users for their display name before entering a board.

## Key Libraries
- `react-router-dom`: For client-side routing.
- `socket.io-client`: For real-time state synchronization with the backend.
- `@hello-pangea/dnd`: For drag-and-drop card movements between columns.

## Development
Run `npm run dev` in the `client` directory to start the Vite dev server, which proxies API requests to the backend server running on port 3000.
