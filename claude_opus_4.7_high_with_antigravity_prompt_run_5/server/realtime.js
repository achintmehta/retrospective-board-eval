import { Server } from 'socket.io';
import { createCard, moveCard, createComment, createColumn, getBoard } from './repository.js';

/**
 * Wire Socket.io onto an HTTP server. Each board has its own room keyed
 * by the board id. Clients emit intent events; we write to SQLite and
 * broadcast the canonical result back to the room.
 */
export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket) => {
    let joinedBoard = null;

    socket.on('join_board', ({ boardId, displayName } = {}, cb) => {
      if (!boardId) return cb?.({ error: 'boardId required' });
      const board = getBoard(boardId);
      if (!board) return cb?.({ error: 'board not found' });

      if (joinedBoard) socket.leave(`board:${joinedBoard}`);
      joinedBoard = boardId;
      socket.data.displayName = displayName || 'Guest';
      socket.join(`board:${boardId}`);

      // Notify other room members about presence
      const room = io.sockets.adapter.rooms.get(`board:${boardId}`);
      const memberCount = room ? room.size : 1;
      io.to(`board:${boardId}`).emit('presence_update', { count: memberCount });

      cb?.({ ok: true, board });
    });

    socket.on('add_card', ({ columnId, content } = {}, cb) => {
      const authorName = socket.data.displayName || 'Guest';
      if (!columnId || !content?.trim()) return cb?.({ error: 'invalid payload' });
      const result = createCard({ columnId, content, authorName });
      if (!result) return cb?.({ error: 'column not found' });
      io.to(`board:${result.boardId}`).emit('card_added', { card: result.card });
      cb?.({ ok: true, card: result.card });
    });

    socket.on('move_card', ({ cardId, toColumnId, toIndex } = {}, cb) => {
      if (!cardId || !toColumnId || typeof toIndex !== 'number') {
        return cb?.({ error: 'invalid payload' });
      }
      const result = moveCard({ cardId, toColumnId, toIndex });
      if (!result) return cb?.({ error: 'move failed' });
      io.to(`board:${result.boardId}`).emit('card_moved', result);
      cb?.({ ok: true });
    });

    socket.on('add_comment', ({ cardId, content } = {}, cb) => {
      const authorName = socket.data.displayName || 'Guest';
      if (!cardId || !content?.trim()) return cb?.({ error: 'invalid payload' });
      const result = createComment({ cardId, content, authorName });
      if (!result) return cb?.({ error: 'card not found' });
      io.to(`board:${result.boardId}`).emit('comment_added', { comment: result.comment });
      cb?.({ ok: true, comment: result.comment });
    });

    socket.on('add_column', ({ boardId, title, color } = {}, cb) => {
      if (!boardId || !title?.trim()) return cb?.({ error: 'invalid payload' });
      const column = createColumn(boardId, title, color || 'violet');
      if (!column) return cb?.({ error: 'board not found' });
      io.to(`board:${boardId}`).emit('column_added', { column: { ...column, cards: [] } });
      cb?.({ ok: true, column });
    });

    socket.on('disconnect', () => {
      if (joinedBoard) {
        const room = io.sockets.adapter.rooms.get(`board:${joinedBoard}`);
        const memberCount = room ? room.size : 0;
        io.to(`board:${joinedBoard}`).emit('presence_update', { count: memberCount });
      }
    });
  });

  return io;
}
