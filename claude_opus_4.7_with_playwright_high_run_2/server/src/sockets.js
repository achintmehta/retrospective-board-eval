import { createCard, moveCard, createComment, getBoardFull } from './db.js';

const roomFor = (boardId) => `board:${boardId}`;

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedBoardId = null;

    socket.on('join_board', async ({ boardId } = {}, ack) => {
      try {
        if (!boardId) throw new Error('boardId required');
        const board = await getBoardFull(boardId);
        if (!board) throw new Error('Board not found');
        if (joinedBoardId && joinedBoardId !== boardId) {
          socket.leave(roomFor(joinedBoardId));
        }
        joinedBoardId = boardId;
        socket.join(roomFor(boardId));
        ack?.({ ok: true, board });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('add_card', async ({ columnId, content, authorName } = {}, ack) => {
      try {
        if (!columnId || !content?.trim() || !authorName?.trim()) {
          throw new Error('columnId, content, authorName required');
        }
        const { card, boardId } = await createCard({
          columnId,
          content: content.trim(),
          authorName: authorName.trim(),
        });
        io.to(roomFor(boardId)).emit('card_added', { card });
        ack?.({ ok: true, card });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', async ({ cardId, toColumnId, toIndex } = {}, ack) => {
      try {
        if (!cardId || !toColumnId) throw new Error('cardId and toColumnId required');
        const result = await moveCard({ cardId, toColumnId, toIndex });
        io.to(roomFor(result.boardId)).emit('card_moved', {
          card: result.card,
          fromColumnId: result.fromColumnId,
          toColumnId: result.toColumnId,
        });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', async ({ cardId, content, authorName } = {}, ack) => {
      try {
        if (!cardId || !content?.trim() || !authorName?.trim()) {
          throw new Error('cardId, content, authorName required');
        }
        const { comment, boardId } = await createComment({
          cardId,
          content: content.trim(),
          authorName: authorName.trim(),
        });
        io.to(roomFor(boardId)).emit('comment_added', { comment });
        ack?.({ ok: true, comment });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (joinedBoardId) socket.leave(roomFor(joinedBoardId));
    });
  });
}
