import { boards, cards, comments, columns } from './db.js';

const MAX_CARD_LEN = 1000;
const MAX_COMMENT_LEN = 1000;
const MAX_NAME_LEN = 60;

function clean(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = 'Anonymous';

    socket.on('join_board', ({ boardId, displayName: name } = {}, ack) => {
      const board = boards.get(boardId);
      if (!board) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Board not found.' });
        return;
      }
      const safeName = clean(name, MAX_NAME_LEN) || 'Guest';
      if (joinedBoardId && joinedBoardId !== boardId) {
        socket.leave(`board:${joinedBoardId}`);
      }
      joinedBoardId = boardId;
      displayName = safeName;
      socket.join(`board:${boardId}`);
      const room = io.sockets.adapter.rooms.get(`board:${boardId}`);
      const presenceCount = room ? room.size : 1;
      io.to(`board:${boardId}`).emit('presence', { count: presenceCount });
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('add_card', ({ boardId, columnId, content } = {}, ack) => {
      if (boardId !== joinedBoardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Not joined to this board.' });
        return;
      }
      const safeContent = clean(content, MAX_CARD_LEN);
      if (!safeContent) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Card content is required.' });
        return;
      }
      const column = columns.get(columnId);
      if (!column || column.board_id !== boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Column not found.' });
        return;
      }
      const card = cards.create(columnId, safeContent, displayName);
      io.to(`board:${boardId}`).emit('card_added', { card });
      if (typeof ack === 'function') ack({ ok: true, card });
    });

    socket.on('move_card', ({ boardId, cardId, toColumnId, toIndex } = {}, ack) => {
      if (boardId !== joinedBoardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Not joined to this board.' });
        return;
      }
      const target = columns.get(toColumnId);
      if (!target || target.board_id !== boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Target column not found.' });
        return;
      }
      const card = cards.get(cardId);
      if (!card) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Card not found.' });
        return;
      }
      const original = columns.get(card.column_id);
      if (!original || original.board_id !== boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Card not in this board.' });
        return;
      }
      const updated = cards.move(cardId, toColumnId, toIndex);
      io.to(`board:${boardId}`).emit('card_moved', {
        cardId,
        fromColumnId: card.column_id,
        toColumnId,
        toIndex: updated?.position ?? toIndex,
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('add_comment', ({ boardId, cardId, content } = {}, ack) => {
      if (boardId !== joinedBoardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Not joined to this board.' });
        return;
      }
      const safeContent = clean(content, MAX_COMMENT_LEN);
      if (!safeContent) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Comment content is required.' });
        return;
      }
      const card = cards.get(cardId);
      if (!card) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Card not found.' });
        return;
      }
      const column = columns.get(card.column_id);
      if (!column || column.board_id !== boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Card not in this board.' });
        return;
      }
      const comment = comments.create(cardId, safeContent, displayName);
      io.to(`board:${boardId}`).emit('comment_added', { cardId, comment });
      if (typeof ack === 'function') ack({ ok: true, comment });
    });

    socket.on('column_created', ({ boardId, column } = {}) => {
      if (boardId !== joinedBoardId || !column) return;
      socket.to(`board:${boardId}`).emit('column_added', { column });
    });

    socket.on('disconnect', () => {
      if (joinedBoardId) {
        const room = io.sockets.adapter.rooms.get(`board:${joinedBoardId}`);
        const presenceCount = room ? room.size : 0;
        io.to(`board:${joinedBoardId}`).emit('presence', { count: presenceCount });
      }
    });
  });
}
