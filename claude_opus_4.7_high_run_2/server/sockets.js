const repo = require('./repository');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // 5.2 Join a board room
    socket.on('join_board', ({ boardId }, ack) => {
      if (!boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'boardId required' });
        return;
      }
      const board = repo.getBoardWithChildren(boardId);
      if (!board) {
        if (typeof ack === 'function') ack({ ok: false, error: 'board not found' });
        return;
      }
      socket.join(`board:${boardId}`);
      if (typeof ack === 'function') ack({ ok: true, board });
    });

    socket.on('leave_board', ({ boardId }) => {
      if (boardId) socket.leave(`board:${boardId}`);
    });

    // 5.3 Add card
    socket.on('add_card', (payload, ack) => {
      const { columnId, content, authorName, boardId } = payload || {};
      if (!columnId || !content || !authorName) {
        if (typeof ack === 'function') ack({ ok: false, error: 'missing fields' });
        return;
      }
      const card = repo.createCard({
        columnId,
        content: String(content).slice(0, 2000),
        authorName: String(authorName).slice(0, 80),
      });
      if (!card) {
        if (typeof ack === 'function') ack({ ok: false, error: 'column not found' });
        return;
      }
      const targetRoom = `board:${boardId || card.boardId}`;
      io.to(targetRoom).emit('card_added', card);
      if (typeof ack === 'function') ack({ ok: true, card });
    });

    // 5.4 Move card
    socket.on('move_card', (payload, ack) => {
      const { cardId, toColumnId, toIndex, boardId } = payload || {};
      if (!cardId || !toColumnId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'missing fields' });
        return;
      }
      const result = repo.moveCard({ cardId, toColumnId, toIndex });
      if (!result) {
        if (typeof ack === 'function') ack({ ok: false, error: 'card or column not found' });
        return;
      }
      const targetRoom = `board:${boardId || result.boardId}`;
      io.to(targetRoom).emit('card_moved', result);
      if (typeof ack === 'function') ack({ ok: true, ...result });
    });

    // 5.5 Add comment
    socket.on('add_comment', (payload, ack) => {
      const { cardId, content, authorName, boardId } = payload || {};
      if (!cardId || !content || !authorName) {
        if (typeof ack === 'function') ack({ ok: false, error: 'missing fields' });
        return;
      }
      const comment = repo.createComment({
        cardId,
        content: String(content).slice(0, 2000),
        authorName: String(authorName).slice(0, 80),
      });
      if (!comment) {
        if (typeof ack === 'function') ack({ ok: false, error: 'card not found' });
        return;
      }
      const targetRoom = `board:${boardId || comment.boardId}`;
      io.to(targetRoom).emit('comment_added', comment);
      if (typeof ack === 'function') ack({ ok: true, comment });
    });
  });
}

module.exports = { registerSocketHandlers };
