const repo = require('./repository');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = 'Anonymous';

    socket.on('join_board', ({ boardId, name } = {}, ack) => {
      try {
        if (!boardId) throw new Error('boardId is required');
        const board = repo.getBoardById(boardId);
        if (!board) {
          if (typeof ack === 'function') ack({ ok: false, error: 'board not found' });
          return;
        }
        if (joinedBoardId && joinedBoardId !== boardId) {
          socket.leave(`board:${joinedBoardId}`);
        }
        socket.join(`board:${boardId}`);
        joinedBoardId = boardId;
        if (name) displayName = String(name).slice(0, 64);
        if (typeof ack === 'function') ack({ ok: true, board });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('add_card', ({ columnId, content, authorName } = {}, ack) => {
      try {
        const name = authorName || displayName;
        const { card, boardId } = repo.addCard({ columnId, content, authorName: name });
        io.to(`board:${boardId}`).emit('card_added', card);
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', ({ cardId, toColumnId, newIndex } = {}, ack) => {
      try {
        const { card, fromColumnId, toColumnId: toId, boardId } = repo.moveCard({ cardId, toColumnId, newIndex });
        io.to(`board:${boardId}`).emit('card_moved', {
          card,
          fromColumnId,
          toColumnId: toId,
        });
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', ({ cardId, content, authorName } = {}, ack) => {
      try {
        const name = authorName || displayName;
        const { comment, boardId } = repo.addComment({ cardId, content, authorName: name });
        io.to(`board:${boardId}`).emit('comment_added', comment);
        if (typeof ack === 'function') ack({ ok: true, comment });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      // socket.io cleans up rooms on disconnect; nothing else to do.
    });
  });
}

module.exports = { registerSocketHandlers };
