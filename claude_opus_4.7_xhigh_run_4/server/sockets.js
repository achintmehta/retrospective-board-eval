import { createCard, moveCard, createComment, getBoardSummary } from './db.js';

const MAX_CARD_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 2000;
const MAX_NAME_LENGTH = 60;

function sanitizeString(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function roomFor(boardId) {
  return `board:${boardId}`;
}

export function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boards = new Set();

    socket.on('join_board', ({ boardId, displayName } = {}, ack) => {
      if (typeof boardId !== 'string') {
        return ack?.({ ok: false, error: 'boardId required' });
      }
      const board = getBoardSummary(boardId);
      if (!board) return ack?.({ ok: false, error: 'Board not found' });

      const name = sanitizeString(displayName, MAX_NAME_LENGTH);
      if (!name) return ack?.({ ok: false, error: 'displayName required' });

      socket.data.displayName = name;
      socket.data.boards.add(boardId);
      socket.join(roomFor(boardId));
      ack?.({ ok: true, board });
    });

    socket.on('leave_board', ({ boardId } = {}, ack) => {
      if (typeof boardId !== 'string') return ack?.({ ok: false });
      socket.leave(roomFor(boardId));
      socket.data.boards.delete(boardId);
      ack?.({ ok: true });
    });

    socket.on('add_card', ({ boardId, columnId, content } = {}, ack) => {
      const displayName = socket.data.displayName;
      if (!displayName) return ack?.({ ok: false, error: 'Join board first' });
      if (!socket.data.boards.has(boardId)) {
        return ack?.({ ok: false, error: 'Not in board room' });
      }
      const text = sanitizeString(content, MAX_CARD_LENGTH);
      if (!text) return ack?.({ ok: false, error: 'content required' });

      const card = createCard({ columnId, content: text, authorName: displayName });
      if (!card) return ack?.({ ok: false, error: 'Column not found' });

      io.to(roomFor(boardId)).emit('card_added', { boardId, card });
      ack?.({ ok: true, card });
    });

    socket.on('move_card', ({ boardId, cardId, targetColumnId, targetIndex } = {}, ack) => {
      if (!socket.data.displayName) return ack?.({ ok: false, error: 'Join board first' });
      if (!socket.data.boards.has(boardId)) {
        return ack?.({ ok: false, error: 'Not in board room' });
      }
      const updated = moveCard({
        cardId,
        targetColumnId,
        targetIndex,
      });
      if (!updated) return ack?.({ ok: false, error: 'Card or column not found' });

      io.to(roomFor(boardId)).emit('card_moved', {
        boardId,
        cardId: updated.id,
        sourceColumnId: updated.column_id,
        targetColumnId: updated.column_id,
        targetIndex: updated.position,
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', ({ boardId, cardId, content } = {}, ack) => {
      const displayName = socket.data.displayName;
      if (!displayName) return ack?.({ ok: false, error: 'Join board first' });
      if (!socket.data.boards.has(boardId)) {
        return ack?.({ ok: false, error: 'Not in board room' });
      }
      const text = sanitizeString(content, MAX_COMMENT_LENGTH);
      if (!text) return ack?.({ ok: false, error: 'content required' });

      const comment = createComment({ cardId, content: text, authorName: displayName });
      if (!comment) return ack?.({ ok: false, error: 'Card not found' });

      io.to(roomFor(boardId)).emit('comment_added', { boardId, comment });
      ack?.({ ok: true, comment });
    });
  });
}
