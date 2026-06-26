import {
  createCard,
  createComment,
  moveCard,
  getColumnBoard,
  getCardColumnBoard,
  getBoard
} from '../db.js';

function safeStr(v, max = 5000) {
  return String(v ?? '').slice(0, max);
}

export function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boardId = null;
    socket.data.displayName = null;

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      const id = safeStr(boardId, 128).trim();
      const name = safeStr(displayName, 64).trim();
      if (!id) return ack?.({ ok: false, error: 'boardId required' });
      if (!name) return ack?.({ ok: false, error: 'displayName required' });
      const board = getBoard(id);
      if (!board) return ack?.({ ok: false, error: 'board not found' });

      // Leave previous board room if any
      if (socket.data.boardId && socket.data.boardId !== id) {
        socket.leave(`board:${socket.data.boardId}`);
      }
      socket.data.boardId = id;
      socket.data.displayName = name;
      socket.join(`board:${id}`);
      ack?.({ ok: true });
    });

    socket.on('add_card', ({ columnId, content }, ack) => {
      const colId = safeStr(columnId, 128).trim();
      const text = safeStr(content, 5000).trim();
      const author = socket.data.displayName;
      const boardId = socket.data.boardId;
      if (!author || !boardId) return ack?.({ ok: false, error: 'not joined' });
      if (!text) return ack?.({ ok: false, error: 'content required' });
      const colBoard = getColumnBoard(colId);
      if (!colBoard || colBoard.board_id !== boardId) {
        return ack?.({ ok: false, error: 'column not on this board' });
      }
      const card = createCard(colId, text, author);
      io.to(`board:${boardId}`).emit('card_added', card);
      ack?.({ ok: true, card });
    });

    socket.on('move_card', ({ cardId, toColumnId, toPosition }, ack) => {
      const id = safeStr(cardId, 128).trim();
      const toCol = safeStr(toColumnId, 128).trim();
      const pos = Number.isFinite(toPosition) ? Math.max(0, Math.floor(toPosition)) : 0;
      const boardId = socket.data.boardId;
      if (!boardId) return ack?.({ ok: false, error: 'not joined' });
      const cardLoc = getCardColumnBoard(id);
      const colBoard = getColumnBoard(toCol);
      if (!cardLoc || cardLoc.board_id !== boardId) return ack?.({ ok: false, error: 'card not on this board' });
      if (!colBoard || colBoard.board_id !== boardId) return ack?.({ ok: false, error: 'column not on this board' });
      const updated = moveCard(id, toCol, pos);
      io.to(`board:${boardId}`).emit('card_moved', {
        cardId: id,
        fromColumnId: cardLoc.column_id,
        toColumnId: toCol,
        toPosition: updated?.position ?? pos
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', ({ cardId, content }, ack) => {
      const id = safeStr(cardId, 128).trim();
      const text = safeStr(content, 5000).trim();
      const author = socket.data.displayName;
      const boardId = socket.data.boardId;
      if (!author || !boardId) return ack?.({ ok: false, error: 'not joined' });
      if (!text) return ack?.({ ok: false, error: 'content required' });
      const cardLoc = getCardColumnBoard(id);
      if (!cardLoc || cardLoc.board_id !== boardId) {
        return ack?.({ ok: false, error: 'card not on this board' });
      }
      const comment = createComment(id, text, author);
      io.to(`board:${boardId}`).emit('comment_added', comment);
      ack?.({ ok: true, comment });
    });
  });
}
