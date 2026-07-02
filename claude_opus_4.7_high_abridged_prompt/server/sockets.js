import * as repo from './repository.js';

const MAX_CONTENT = 2000;

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = 'Guest';

    socket.on('join_board', ({ boardId, name } = {}, ack) => {
      if (!boardId) return ack?.({ ok: false, error: 'boardId required' });
      if (joinedBoardId) socket.leave(`board:${joinedBoardId}`);
      joinedBoardId = boardId;
      displayName = (name || 'Guest').toString().slice(0, 40);
      socket.join(`board:${boardId}`);
      ack?.({ ok: true });
    });

    socket.on('add_card', async ({ columnId, content } = {}, ack) => {
      const text = (content || '').toString().trim();
      if (!columnId || !text) return ack?.({ ok: false, error: 'invalid payload' });
      if (text.length > MAX_CONTENT) return ack?.({ ok: false, error: 'content too long' });
      try {
        const result = await repo.createCard({
          columnId,
          content: text,
          authorName: displayName,
        });
        if (!result) return ack?.({ ok: false, error: 'column not found' });
        io.to(`board:${result.boardId}`).emit('card_added', result.card);
        ack?.({ ok: true, card: result.card });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', async ({ cardId, toColumnId, toPosition } = {}, ack) => {
      if (!cardId || !toColumnId) return ack?.({ ok: false, error: 'invalid payload' });
      try {
        const result = await repo.moveCard({ cardId, toColumnId, toPosition });
        if (!result) return ack?.({ ok: false, error: 'card or column not found' });
        io.to(`board:${result.boardId}`).emit('card_moved', {
          card: result.card,
          fromColumnId: result.fromColumnId,
          toColumnId: result.toColumnId,
          toPosition: result.toPosition,
        });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', async ({ cardId, content } = {}, ack) => {
      const text = (content || '').toString().trim();
      if (!cardId || !text) return ack?.({ ok: false, error: 'invalid payload' });
      if (text.length > MAX_CONTENT) return ack?.({ ok: false, error: 'content too long' });
      try {
        const result = await repo.createComment({
          cardId,
          content: text,
          authorName: displayName,
        });
        if (!result) return ack?.({ ok: false, error: 'card not found' });
        io.to(`board:${result.boardId}`).emit('comment_added', result.comment);
        ack?.({ ok: true, comment: result.comment });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });
  });
}
