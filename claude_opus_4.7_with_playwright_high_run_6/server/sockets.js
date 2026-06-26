import { addCard, moveCard, addComment, boardExists } from './repository.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let currentBoardId = null;

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId || !boardExists(boardId)) {
        return ack?.({ ok: false, error: 'Board not found' });
      }
      if (currentBoardId) socket.leave(`board:${currentBoardId}`);
      currentBoardId = boardId;
      socket.data.displayName = displayName || 'Guest';
      socket.join(`board:${boardId}`);
      ack?.({ ok: true });
    });

    socket.on('add_card', (payload, ack) => {
      try {
        const { columnId, content } = payload || {};
        const authorName = socket.data.displayName || 'Guest';
        const { boardId, card } = addCard({ columnId, content, authorName });
        io.to(`board:${boardId}`).emit('card_added', { columnId, card });
        ack?.({ ok: true, card });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', (payload, ack) => {
      try {
        const { cardId, toColumnId, toPosition } = payload || {};
        const result = moveCard({ cardId, toColumnId, toPosition: toPosition ?? 0 });
        io.to(`board:${result.boardId}`).emit('card_moved', {
          cardId: result.cardId,
          fromColumnId: result.fromColumnId,
          toColumnId: result.toColumnId,
          toPosition: result.toPosition,
        });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', (payload, ack) => {
      try {
        const { cardId, content } = payload || {};
        const authorName = socket.data.displayName || 'Guest';
        const { boardId, comment } = addComment({ cardId, content, authorName });
        io.to(`board:${boardId}`).emit('comment_added', { cardId, comment });
        ack?.({ ok: true, comment });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      // socket.io auto-leaves all rooms; nothing extra to do
    });
  });
}
