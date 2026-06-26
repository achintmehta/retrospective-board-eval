import { repo } from './db.js';

export function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boardId = null;
    socket.data.displayName = null;

    socket.on('join_board', ({ boardId, displayName } = {}, ack) => {
      if (typeof boardId !== 'string' || !boardId) {
        if (typeof ack === 'function') ack({ error: 'boardId is required' });
        return;
      }
      const board = repo.getBoardWithContents(boardId);
      if (!board) {
        if (typeof ack === 'function') ack({ error: 'board not found' });
        return;
      }
      if (socket.data.boardId && socket.data.boardId !== boardId) {
        socket.leave(`board:${socket.data.boardId}`);
      }
      socket.data.boardId = boardId;
      if (typeof displayName === 'string') {
        socket.data.displayName = displayName.trim().slice(0, 80) || 'Guest';
      }
      socket.join(`board:${boardId}`);
      if (typeof ack === 'function') ack({ board });
    });

    socket.on('add_card', ({ columnId, content, authorName } = {}, ack) => {
      const text = typeof content === 'string' ? content.trim() : '';
      const author = sanitizeName(authorName ?? socket.data.displayName);
      if (!columnId || !text) {
        if (typeof ack === 'function') ack({ error: 'columnId and content are required' });
        return;
      }
      const result = repo.createCard({ columnId, content: text, authorName: author });
      if (!result) {
        if (typeof ack === 'function') ack({ error: 'column not found' });
        return;
      }
      io.to(`board:${result.boardId}`).emit('card_added', { card: result.card });
      if (typeof ack === 'function') ack({ card: result.card });
    });

    socket.on('move_card', ({ cardId, toColumnId, position } = {}, ack) => {
      if (!cardId || !toColumnId) {
        if (typeof ack === 'function') ack({ error: 'cardId and toColumnId are required' });
        return;
      }
      const result = repo.moveCard({ cardId, toColumnId, position: Number(position) });
      if (!result) {
        if (typeof ack === 'function') ack({ error: 'card or column not found' });
        return;
      }
      io.to(`board:${result.boardId}`).emit('card_moved', { card: result.card });
      if (typeof ack === 'function') ack({ card: result.card });
    });

    socket.on('add_comment', ({ cardId, content, authorName } = {}, ack) => {
      const text = typeof content === 'string' ? content.trim() : '';
      const author = sanitizeName(authorName ?? socket.data.displayName);
      if (!cardId || !text) {
        if (typeof ack === 'function') ack({ error: 'cardId and content are required' });
        return;
      }
      const result = repo.createComment({ cardId, content: text, authorName: author });
      if (!result) {
        if (typeof ack === 'function') ack({ error: 'card not found' });
        return;
      }
      io.to(`board:${result.boardId}`).emit('comment_added', { comment: result.comment });
      if (typeof ack === 'function') ack({ comment: result.comment });
    });
  });
}

function sanitizeName(name) {
  if (typeof name !== 'string') return 'Guest';
  const trimmed = name.trim().slice(0, 80);
  return trimmed || 'Guest';
}
