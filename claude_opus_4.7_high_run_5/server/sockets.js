const repo = require('./repository');

function sanitizeName(name) {
  return (name && String(name).trim().slice(0, 60)) || 'Guest';
}

function sanitizeContent(content, max = 2000) {
  return (content && String(content).trim().slice(0, max)) || '';
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boardId = null;
    socket.data.displayName = 'Guest';

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'boardId required' });
        return;
      }
      const board = repo.getBoard(boardId);
      if (!board) {
        if (typeof ack === 'function') ack({ ok: false, error: 'board not found' });
        return;
      }

      // Leave any previously joined board room
      if (socket.data.boardId && socket.data.boardId !== boardId) {
        socket.leave(`board:${socket.data.boardId}`);
      }

      socket.data.boardId = boardId;
      socket.data.displayName = sanitizeName(displayName);
      socket.join(`board:${boardId}`);

      if (typeof ack === 'function') ack({ ok: true, board });
    });

    socket.on('add_card', (payload, ack) => {
      const boardId = socket.data.boardId;
      if (!boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'not joined to a board' });
        return;
      }
      const columnId = payload && payload.columnId;
      const content = sanitizeContent(payload && payload.content);
      if (!columnId || !content) {
        if (typeof ack === 'function') ack({ ok: false, error: 'columnId and content required' });
        return;
      }

      const result = repo.addCard({
        columnId,
        content,
        authorName: socket.data.displayName,
      });
      if (!result || result.boardId !== boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid column' });
        return;
      }

      const card = { ...result.card, comments: [] };
      io.to(`board:${boardId}`).emit('card_added', card);
      if (typeof ack === 'function') ack({ ok: true, card });
    });

    socket.on('move_card', (payload, ack) => {
      const boardId = socket.data.boardId;
      if (!boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'not joined to a board' });
        return;
      }
      const { cardId, toColumnId, newPosition } = payload || {};
      if (!cardId || !toColumnId || typeof newPosition !== 'number') {
        if (typeof ack === 'function') ack({ ok: false, error: 'cardId, toColumnId, newPosition required' });
        return;
      }

      const result = repo.moveCard({ cardId, toColumnId, newPosition });
      if (!result || result.boardId !== boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid move' });
        return;
      }

      io.to(`board:${boardId}`).emit('card_moved', {
        cardId: result.cardId,
        fromColumnId: result.fromColumnId,
        toColumnId: result.toColumnId,
        newPosition: result.newPosition,
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('add_comment', (payload, ack) => {
      const boardId = socket.data.boardId;
      if (!boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'not joined to a board' });
        return;
      }
      const cardId = payload && payload.cardId;
      const content = sanitizeContent(payload && payload.content, 1000);
      if (!cardId || !content) {
        if (typeof ack === 'function') ack({ ok: false, error: 'cardId and content required' });
        return;
      }

      const result = repo.addComment({
        cardId,
        content,
        authorName: socket.data.displayName,
      });
      if (!result || result.boardId !== boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid card' });
        return;
      }

      io.to(`board:${boardId}`).emit('comment_added', result.comment);
      if (typeof ack === 'function') ack({ ok: true, comment: result.comment });
    });

    socket.on('disconnect', () => {
      // Socket.io leaves rooms automatically on disconnect.
    });
  });
}

module.exports = { registerSocketHandlers };
