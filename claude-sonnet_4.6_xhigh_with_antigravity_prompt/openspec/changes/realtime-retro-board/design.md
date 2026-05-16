## Context

We are building a new real-time retrospective board application from scratch. The core constraints are that it must run entirely locally or via a single, self-contained Docker image, with no complex setup like `docker-compose` or separate database servers. It must support multiple users simultaneously interacting with a board.

## Goals / Non-Goals

**Goals:**
- Provide real-time UI updates across all clients for adding, moving cards, and commenting.
- Enable trivial local installation and a single-container Docker deployment.
- Implement guest-based "display name" sessions for frictionless boarding.
- Support exporting board data to CSV.

**Non-Goals:**
- Implementing a full identity provider (OAuth/SSO) or complex role-based access control (RBAC).
- Supporting massive scale (thousands of concurrent users per board); it is designed for team-level retrospectives.
- Implementing an offline-first syncing mechanism (if you disconnect, you reconnect).

## Decisions

1. **Architecture & Stack: TypeScript Full-Stack**
   - **Frontend:** React via Vite. Enables quick UI development with access to drag-and-drop libraries (`dnd-kit` or `@hello-pangea/dnd`).
   - **Backend:** Node.js with Express. Allows code/type sharing between frontend and backend.
   - **Real-Time:** `socket.io`. Provides out-of-the-box WebSocket support with room-based broadcast mechanisms and automatic reconnects, which is much simpler than handling raw WebSockets.
   - **Alternative Considered:** Go backend. While leaner, TypeScript allows unified domain models and easier integration with the React ecosystem for this specific feature set.

2. **Storage: SQLite**
   - **Decision:** Use SQLite as the single database. 
   - **Rationale:** Perfect for the "single Docker container" constraint. The `.sqlite` file can simply be mapped to a Docker volume to persist data across container restarts. No need for Postgres or Redis.

3. **Data Model Structure**
   - `Board`: id, title, created_at
   - `BoardColumn`: id, board_id, title, position
   - `Card`: id, column_id, content, author_name, created_at, position
   - `Comment`: id, card_id, content, author_name, created_at

4. **State Synchronization Strategy**
   - **Decision:** The server acts as the source of truth. When a client performs an action (e.g., move a card), it emits a Socket.io event to the server. The server writes to SQLite, then broadcasts the updated state (or the specific event) to the board's room. Clients maintain optimistic UI or simply update their local state on broadcast reception.

## Risks / Trade-offs

- **Risk:** SQLite Concurrency Limits.
  - **Mitigation:** Since this tool targets team-level retrospectives (10-30 users), concurrent writes will be well within SQLite's safe operating limits, especially when using WAL (Write-Ahead Logging) mode.
- **Risk:** Client state drifting during temporary disconnects.
  - **Mitigation:** Socket.io handles reconnections. Upon reconnect, the client should refetch the full board state from the server to ensure consistency.
