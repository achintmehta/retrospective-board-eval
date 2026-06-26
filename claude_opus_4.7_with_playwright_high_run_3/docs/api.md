# API Reference

The server exposes a small REST API for board lifecycle plus a Socket.io channel for real-time collaboration on cards and comments. All HTTP responses are JSON unless noted; all timestamps are unix milliseconds.

Base URL: `http://localhost:3001` (or whatever `PORT` is set to). In development, the Vite dev server proxies `/api` and `/socket.io`.

## Data Model

```ts
Board   = { id: string, title: string, createdAt: number, columns: Column[] }
Column  = { id: string, boardId: string, title: string, position: number, cards: Card[] }
Card    = { id: string, columnId: string, content: string, authorName: string,
            createdAt: number, position: number, comments: Comment[] }
Comment = { id: string, cardId: string, content: string, authorName: string, createdAt: number }
```

## REST Endpoints

### `GET /api/boards`
List boards, newest first.
```json
[{ "id": "abc", "title": "Sprint 24 Retro", "createdAt": 1719320000000 }]
```

### `POST /api/boards`
Create a board. The server provisions three default columns: *Went Well*, *Needs Improvement*, *Action Items*.

Request:
```json
{ "title": "Sprint 24 Retro" }
```
Responses:
- `201 Created` — full board object (with columns/cards/comments populated).
- `400 Bad Request` — `{ "error": "title is required" }`

### `GET /api/boards/:id`
Fetch a single board, fully populated.
- `200 OK` — `Board`
- `404 Not Found` — `{ "error": "board not found" }`

### `POST /api/boards/:id/columns`
Append a new column to a board. Returns the created column (without cards).

Request:
```json
{ "title": "Action Items" }
```
Responses:
- `201 Created` — `Column` (without `cards`)
- `400 Bad Request` — `{ "error": "title is required" }`
- `404 Not Found` — `{ "error": "board not found" }`

### `GET /api/boards/:id/export`
Stream the entire board as CSV. Sets `Content-Type: text/csv; charset=utf-8` and a `Content-Disposition: attachment` header. One row per comment (or one row per card if it has no comments); empty columns get a row with empty card/comment fields.

Header row:
```
Column,Card Content,Card Author,Card Created At,Comment Author,Comment Content,Comment Created At
```

### `GET /api/health`
Liveness probe. Returns `{ "ok": true }`.

## WebSocket (Socket.io)

Path: `/socket.io` (default). Connect with `socket.io-client`. Each socket joins one or more **board rooms** to receive scoped broadcasts.

### Client → Server

| Event          | Payload                                                                          | Ack                                            |
|----------------|----------------------------------------------------------------------------------|------------------------------------------------|
| `join_board`   | `{ boardId }`                                                                    | `{ ok: true }` or `{ ok: false, error }`       |
| `leave_board`  | `{ boardId }`                                                                    | _(no ack)_                                     |
| `add_card`     | `{ boardId, columnId, content, authorName }`                                     | `{ ok, card?, error? }`                        |
| `move_card`    | `{ boardId, cardId, newColumnId, newPosition }`                                  | `{ ok, error? }`                               |
| `add_comment`  | `{ boardId, cardId, content, authorName }`                                       | `{ ok, comment?, error? }`                     |

`authorName` is trimmed; empty becomes `"Anonymous"`.

### Server → Client (broadcast to board room)

| Event           | Payload                                                                         |
|-----------------|---------------------------------------------------------------------------------|
| `card_added`    | `{ card }` — the new `Card` (with empty `comments`).                            |
| `card_moved`    | `{ cardId, newColumnId, newPosition, oldColumnId }`                             |
| `comment_added` | `{ comment }` — the new `Comment`.                                              |

### Reconnect Behavior

`socket.io-client` reconnects automatically. The client also calls `GET /api/boards/:id` on `connect` to resync state, then re-joins the board room. This recovers from any events missed while offline.

## Errors

All REST errors use the shape `{ "error": "<message>" }`. Socket acks use `{ ok: false, error: "<message>" }`.
