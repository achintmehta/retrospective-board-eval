import {
  createCard,
  moveCard,
  createComment,
  getBoardSummary,
} from './db.js';

const MAX_CARD_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 1000;

function sanitizeName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().slice(0, 40);
}

function sanitizeText(text, max) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, max);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let currentBoardId = null;

    socket.on('join_board', (boardId, ack) => {
      if (typeof boardId !== 'string' || !boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid_board' });
        return;
      }
      const board = getBoardSummary(boardId);
      if (!board) {
        if (typeof ack === 'function') ack({ ok: false, error: 'board_not_found' });
        return;
      }
      if (currentBoardId) {
        socket.leave(roomFor(currentBoardId));
      }
      currentBoardId = boardId;
      socket.join(roomFor(boardId));
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('leave_board', () => {
      if (currentBoardId) {
        socket.leave(roomFor(currentBoardId));
        currentBoardId = null;
      }
    });

    socket.on('add_card', (payload, ack) => {
      try {
        const columnId = payload?.columnId;
        const content = sanitizeText(payload?.content, MAX_CARD_LENGTH);
        const authorName = sanitizeName(payload?.authorName) || 'Anonymous';
        if (!columnId || !content) {
          if (typeof ack === 'function') ack({ ok: false, error: 'invalid_payload' });
          return;
        }
        const card = createCard({ columnId, content, authorName });
        if (!card) {
          if (typeof ack === 'function') ack({ ok: false, error: 'column_not_found' });
          return;
        }
        const payloadOut = { ...card, comments: [] };
        io.to(roomFor(card.boardId)).emit('card_added', payloadOut);
        if (typeof ack === 'function') ack({ ok: true, card: payloadOut });
      } catch (err) {
        console.error('add_card error', err);
        if (typeof ack === 'function') ack({ ok: false, error: 'server_error' });
      }
    });

    socket.on('move_card', (payload, ack) => {
      try {
        const cardId = payload?.cardId;
        const targetColumnId = payload?.targetColumnId;
        const targetPosition = Number(payload?.targetPosition);
        if (!cardId || !targetColumnId || !Number.isFinite(targetPosition)) {
          if (typeof ack === 'function') ack({ ok: false, error: 'invalid_payload' });
          return;
        }
        const result = moveCard({ cardId, targetColumnId, targetPosition });
        if (!result) {
          if (typeof ack === 'function') ack({ ok: false, error: 'card_or_column_not_found' });
          return;
        }
        io.to(roomFor(result.boardId)).emit('card_moved', {
          cardId: result.id,
          fromColumnId: result.fromColumnId,
          toColumnId: result.columnId,
          position: result.position,
        });
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        console.error('move_card error', err);
        if (typeof ack === 'function') ack({ ok: false, error: 'server_error' });
      }
    });

    socket.on('add_comment', (payload, ack) => {
      try {
        const cardId = payload?.cardId;
        const content = sanitizeText(payload?.content, MAX_COMMENT_LENGTH);
        const authorName = sanitizeName(payload?.authorName) || 'Anonymous';
        if (!cardId || !content) {
          if (typeof ack === 'function') ack({ ok: false, error: 'invalid_payload' });
          return;
        }
        const comment = createComment({ cardId, content, authorName });
        if (!comment) {
          if (typeof ack === 'function') ack({ ok: false, error: 'card_not_found' });
          return;
        }
        io.to(roomFor(comment.boardId)).emit('comment_added', comment);
        if (typeof ack === 'function') ack({ ok: true, comment });
      } catch (err) {
        console.error('add_comment error', err);
        if (typeof ack === 'function') ack({ ok: false, error: 'server_error' });
      }
    });

    socket.on('disconnect', () => {
      currentBoardId = null;
    });
  });
}

function roomFor(boardId) {
  return `board:${boardId}`;
}
