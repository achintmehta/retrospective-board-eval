import type { Server as SocketServer, Socket } from 'socket.io';
import {
  boardIdForCard,
  boardIdForColumn,
  createCard,
  createComment,
  getBoard,
  moveCard,
} from '../db/repo.js';
import { boardRoom, EVT } from './events.js';

interface AddCardPayload {
  boardId: string;
  columnId: string;
  content: string;
  authorName: string;
}

interface MoveCardPayload {
  boardId: string;
  cardId: string;
  targetColumnId: string;
  targetIndex: number;
}

interface AddCommentPayload {
  boardId: string;
  cardId: string;
  content: string;
  authorName: string;
}

interface PresenceState {
  boardId: string;
  displayName: string;
}

// socketId -> presence
const presence = new Map<string, PresenceState>();

function currentPresenceFor(io: SocketServer, boardId: string): string[] {
  const room = io.sockets.adapter.rooms.get(boardRoom(boardId));
  if (!room) return [];
  const names: string[] = [];
  for (const socketId of room) {
    const p = presence.get(socketId);
    if (p?.displayName) names.push(p.displayName);
  }
  return Array.from(new Set(names));
}

function broadcastPresence(io: SocketServer, boardId: string): void {
  io.to(boardRoom(boardId)).emit(EVT.PRESENCE, {
    boardId,
    users: currentPresenceFor(io, boardId),
  });
}

export function registerSocketHandlers(io: SocketServer): void {
  io.on('connection', (socket: Socket) => {
    socket.on(
      EVT.JOIN_BOARD,
      ({ boardId, displayName }: { boardId: string; displayName: string }, ack?: (payload: unknown) => void) => {
        if (typeof boardId !== 'string' || !boardId) return;
        const board = getBoard(boardId);
        if (!board) {
          ack?.({ error: 'Board not found' });
          return;
        }

        // If the socket was already in another board room, leave that first
        const prior = presence.get(socket.id);
        if (prior && prior.boardId !== boardId) {
          socket.leave(boardRoom(prior.boardId));
        }

        socket.join(boardRoom(boardId));
        presence.set(socket.id, {
          boardId,
          displayName: (displayName || 'Guest').toString().slice(0, 40),
        });
        broadcastPresence(io, boardId);
        ack?.({ ok: true, board });
      }
    );

    socket.on(EVT.LEAVE_BOARD, ({ boardId }: { boardId: string }) => {
      if (typeof boardId !== 'string') return;
      socket.leave(boardRoom(boardId));
      const p = presence.get(socket.id);
      if (p && p.boardId === boardId) presence.delete(socket.id);
      broadcastPresence(io, boardId);
    });

    socket.on(EVT.ADD_CARD, (payload: AddCardPayload, ack?: (payload: unknown) => void) => {
      const { boardId, columnId, content, authorName } = payload ?? {};
      if (!columnId || !content || boardIdForColumn(columnId) !== boardId) {
        ack?.({ error: 'Invalid card payload' });
        return;
      }
      const card = createCard(columnId, content, authorName);
      if (!card) {
        ack?.({ error: 'Could not create card' });
        return;
      }
      io.to(boardRoom(boardId)).emit(EVT.CARD_ADDED, { card, comments: [] });
      ack?.({ ok: true, card });
    });

    socket.on(EVT.MOVE_CARD, (payload: MoveCardPayload, ack?: (payload: unknown) => void) => {
      const { boardId, cardId, targetColumnId, targetIndex } = payload ?? {};
      if (!cardId || !targetColumnId) {
        ack?.({ error: 'Invalid move payload' });
        return;
      }
      if (boardIdForCard(cardId) !== boardId) {
        ack?.({ error: 'Card does not belong to board' });
        return;
      }
      if (boardIdForColumn(targetColumnId) !== boardId) {
        ack?.({ error: 'Target column does not belong to board' });
        return;
      }
      const result = moveCard(cardId, targetColumnId, targetIndex);
      if (!result) {
        ack?.({ error: 'Could not move card' });
        return;
      }
      io.to(boardRoom(boardId)).emit(EVT.CARD_MOVED, {
        card: result.card,
        sourceColumnId: result.sourceColumnId,
        targetIndex,
      });
      ack?.({ ok: true });
    });

    socket.on(EVT.ADD_COMMENT, (payload: AddCommentPayload, ack?: (payload: unknown) => void) => {
      const { boardId, cardId, content, authorName } = payload ?? {};
      if (!cardId || !content) {
        ack?.({ error: 'Invalid comment payload' });
        return;
      }
      if (boardIdForCard(cardId) !== boardId) {
        ack?.({ error: 'Card does not belong to board' });
        return;
      }
      const comment = createComment(cardId, content, authorName);
      if (!comment) {
        ack?.({ error: 'Could not create comment' });
        return;
      }
      io.to(boardRoom(boardId)).emit(EVT.COMMENT_ADDED, comment);
      ack?.({ ok: true, comment });
    });

    socket.on('disconnect', () => {
      const p = presence.get(socket.id);
      presence.delete(socket.id);
      if (p) broadcastPresence(io, p.boardId);
    });
  });
}
