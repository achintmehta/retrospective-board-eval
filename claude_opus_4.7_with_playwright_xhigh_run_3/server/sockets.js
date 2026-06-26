import { createCard, createComment, getBoard, moveCard } from './db.js';

const BOARD_ROOM = (boardId) => `board:${boardId}`;

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boards = new Set();

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId) {
        ack?.({ ok: false, error: 'boardId is required' });
        return;
      }
      const board = getBoard(boardId);
      if (!board) {
        ack?.({ ok: false, error: 'Board not found' });
        return;
      }
      socket.data.displayName = displayName || 'Guest';
      socket.join(BOARD_ROOM(boardId));
      socket.data.boards.add(boardId);
      ack?.({ ok: true, board });
    });

    socket.on('leave_board', ({ boardId }) => {
      if (!boardId) return;
      socket.leave(BOARD_ROOM(boardId));
      socket.data.boards.delete(boardId);
    });

    socket.on('add_card', ({ boardId, columnId, content, authorName }, ack) => {
      try {
        if (!columnId || !content?.trim()) {
          ack?.({ ok: false, error: 'columnId and content are required' });
          return;
        }
        const card = createCard({
          columnId,
          content: content.trim(),
          authorName: authorName || socket.data.displayName || 'Guest',
        });
        io.to(BOARD_ROOM(boardId)).emit('card_added', { columnId, card });
        ack?.({ ok: true, card });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', ({ boardId, cardId, toColumnId, toIndex }, ack) => {
      try {
        const move = moveCard({ cardId, toColumnId, toIndex });
        if (!move) {
          ack?.({ ok: false, error: 'Card or target column not found' });
          return;
        }
        io.to(BOARD_ROOM(boardId)).emit('card_moved', move);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', ({ boardId, cardId, content, authorName }, ack) => {
      try {
        if (!cardId || !content?.trim()) {
          ack?.({ ok: false, error: 'cardId and content are required' });
          return;
        }
        const comment = createComment({
          cardId,
          content: content.trim(),
          authorName: authorName || socket.data.displayName || 'Guest',
        });
        io.to(BOARD_ROOM(boardId)).emit('comment_added', { cardId, comment });
        ack?.({ ok: true, comment });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });
  });
}
