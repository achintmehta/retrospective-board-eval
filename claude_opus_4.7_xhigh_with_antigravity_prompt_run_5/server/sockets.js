const { Server } = require('socket.io');
const { createCard, moveCard, createComment, getBoard } = require('./db');

function roomFor(boardId) {
  return `board:${boardId}`;
}

function attachSockets(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: { origin: options.corsOrigin || '*' },
  });

  io.on('connection', (socket) => {
    let currentBoardId = null;
    let displayName = 'Anonymous';

    socket.on('join_board', ({ boardId, name }, ack) => {
      try {
        const board = getBoard(boardId);
        if (!board) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Board not found' });
          return;
        }
        if (currentBoardId && currentBoardId !== boardId) {
          socket.leave(roomFor(currentBoardId));
        }
        currentBoardId = boardId;
        displayName = String(name || '').trim() || 'Anonymous';
        socket.join(roomFor(boardId));
        if (typeof ack === 'function') ack({ ok: true, board });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('add_card', (payload, ack) => {
      try {
        if (!currentBoardId) throw new Error('Join a board first');
        const card = createCard({
          boardId: currentBoardId,
          columnId: payload.columnId,
          content: payload.content,
          authorName: payload.authorName || displayName,
        });
        io.to(roomFor(currentBoardId)).emit('card_added', { card });
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', (payload, ack) => {
      try {
        if (!currentBoardId) throw new Error('Join a board first');
        const result = moveCard({
          boardId: currentBoardId,
          cardId: payload.cardId,
          toColumnId: payload.toColumnId,
          toIndex: payload.toIndex,
        });
        io.to(roomFor(currentBoardId)).emit('card_moved', {
          card: result.card,
          fromColumnId: result.fromColumnId,
          toColumnId: result.toColumnId,
          sourceCards: result.sourceCards,
          targetCards: result.targetCards,
        });
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', (payload, ack) => {
      try {
        if (!currentBoardId) throw new Error('Join a board first');
        const comment = createComment({
          boardId: currentBoardId,
          cardId: payload.cardId,
          content: payload.content,
          authorName: payload.authorName || displayName,
        });
        io.to(roomFor(currentBoardId)).emit('comment_added', { comment });
        if (typeof ack === 'function') ack({ ok: true, comment });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (currentBoardId) socket.leave(roomFor(currentBoardId));
    });
  });

  return io;
}

module.exports = { attachSockets };
