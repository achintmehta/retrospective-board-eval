import { Server } from 'socket.io';
import {
  createCard,
  createComment,
  getBoard,
  moveCard,
} from './repository.js';

export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket) => {
    let currentBoardId = null;
    let displayName = 'Guest';

    socket.on('join_board', ({ boardId, name }, ack) => {
      if (!boardId || typeof boardId !== 'string') {
        if (typeof ack === 'function') ack({ ok: false, error: 'boardId required' });
        return;
      }
      const board = getBoard(boardId);
      if (!board) {
        if (typeof ack === 'function') ack({ ok: false, error: 'board not found' });
        return;
      }
      if (currentBoardId && currentBoardId !== boardId) {
        socket.leave(roomFor(currentBoardId));
      }
      currentBoardId = boardId;
      displayName = String(name || 'Guest').trim() || 'Guest';
      socket.join(roomFor(boardId));

      const presence = collectPresence(io, boardId);
      io.to(roomFor(boardId)).emit('presence_updated', presence);

      if (typeof ack === 'function') ack({ ok: true, board });
    });

    socket.on('leave_board', () => {
      if (currentBoardId) {
        socket.leave(roomFor(currentBoardId));
        const boardId = currentBoardId;
        currentBoardId = null;
        io.to(roomFor(boardId)).emit('presence_updated', collectPresence(io, boardId));
      }
    });

    socket.on('add_card', (payload, ack) => {
      try {
        const boardId = currentBoardId;
        if (!boardId) return respond(ack, { ok: false, error: 'not joined to a board' });
        const { columnId, content } = payload || {};
        if (!columnId || !content || !String(content).trim()) {
          return respond(ack, { ok: false, error: 'columnId and content required' });
        }
        if (String(content).length > 500) {
          return respond(ack, { ok: false, error: 'content too long (max 500 chars)' });
        }
        const card = createCard({
          columnId,
          content,
          authorName: payload.authorName || displayName,
        });
        io.to(roomFor(boardId)).emit('card_added', { boardId, card });
        respond(ack, { ok: true, card });
      } catch (err) {
        respond(ack, { ok: false, error: err.message });
      }
    });

    socket.on('move_card', (payload, ack) => {
      try {
        const boardId = currentBoardId;
        if (!boardId) return respond(ack, { ok: false, error: 'not joined to a board' });
        const { cardId, targetColumnId, targetIndex } = payload || {};
        if (!cardId || !targetColumnId || typeof targetIndex !== 'number') {
          return respond(ack, { ok: false, error: 'cardId, targetColumnId, targetIndex required' });
        }
        const result = moveCard({
          cardId,
          targetColumnId,
          targetIndex: Math.floor(targetIndex),
        });
        if (!result) return respond(ack, { ok: false, error: 'card not found' });
        io.to(roomFor(boardId)).emit('card_moved', { boardId, ...result });
        respond(ack, { ok: true });
      } catch (err) {
        respond(ack, { ok: false, error: err.message });
      }
    });

    socket.on('add_comment', (payload, ack) => {
      try {
        const boardId = currentBoardId;
        if (!boardId) return respond(ack, { ok: false, error: 'not joined to a board' });
        const { cardId, content } = payload || {};
        if (!cardId || !content || !String(content).trim()) {
          return respond(ack, { ok: false, error: 'cardId and content required' });
        }
        if (String(content).length > 500) {
          return respond(ack, { ok: false, error: 'content too long (max 500 chars)' });
        }
        const comment = createComment({
          cardId,
          content,
          authorName: payload.authorName || displayName,
        });
        if (!comment) return respond(ack, { ok: false, error: 'card not found' });
        io.to(roomFor(boardId)).emit('comment_added', { boardId, comment });
        respond(ack, { ok: true, comment });
      } catch (err) {
        respond(ack, { ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (currentBoardId) {
        const boardId = currentBoardId;
        currentBoardId = null;
        io.to(roomFor(boardId)).emit('presence_updated', collectPresence(io, boardId));
      }
    });
  });

  return io;
}

function roomFor(boardId) {
  return `board:${boardId}`;
}

function respond(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function collectPresence(io, boardId) {
  const room = io.sockets.adapter.rooms.get(roomFor(boardId));
  return { boardId, count: room ? room.size : 0 };
}
