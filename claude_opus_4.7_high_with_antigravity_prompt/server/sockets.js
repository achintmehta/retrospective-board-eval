import { addCard, moveCard, addComment, getBoard } from './db.js';

const MAX_CONTENT = 2000;

function sanitize(value, maxLen) {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (str.length === 0) return '';
  return str.slice(0, maxLen);
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let currentBoardId = null;
    let displayName = 'Guest';

    socket.on('join_board', ({ boardId, displayName: name }, ack) => {
      const board = getBoard(boardId);
      if (!board) {
        if (typeof ack === 'function') ack({ ok: false, error: 'board not found' });
        return;
      }
      if (currentBoardId && currentBoardId !== boardId) {
        socket.leave(roomFor(currentBoardId));
      }
      currentBoardId = boardId;
      displayName = sanitize(name, 40) || 'Guest';
      socket.join(roomFor(boardId));
      if (typeof ack === 'function') ack({ ok: true, board });
    });

    socket.on('add_card', ({ columnId, content }, ack) => {
      if (!currentBoardId) return ack?.({ ok: false, error: 'not joined' });
      const cleanContent = sanitize(content, MAX_CONTENT);
      if (!cleanContent) return ack?.({ ok: false, error: 'content required' });
      const result = addCard({ columnId, content: cleanContent, authorName: displayName });
      if (!result) return ack?.({ ok: false, error: 'column not found' });
      io.to(roomFor(result.boardId)).emit('card_added', { card: result.card });
      ack?.({ ok: true, card: result.card });
    });

    socket.on('move_card', ({ cardId, targetColumnId, targetIndex }, ack) => {
      if (!currentBoardId) return ack?.({ ok: false, error: 'not joined' });
      const result = moveCard({ cardId, targetColumnId, targetIndex });
      if (!result) return ack?.({ ok: false, error: 'invalid move' });
      io.to(roomFor(result.boardId)).emit('card_moved', {
        card: result.card,
        fromColumnId: result.fromColumnId,
        toColumnId: result.toColumnId
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', ({ cardId, content }, ack) => {
      if (!currentBoardId) return ack?.({ ok: false, error: 'not joined' });
      const cleanContent = sanitize(content, MAX_CONTENT);
      if (!cleanContent) return ack?.({ ok: false, error: 'content required' });
      const result = addComment({ cardId, content: cleanContent, authorName: displayName });
      if (!result) return ack?.({ ok: false, error: 'card not found' });
      io.to(roomFor(result.boardId)).emit('comment_added', { comment: result.comment });
      ack?.({ ok: true, comment: result.comment });
    });

    socket.on('column_added_local', () => {
      // Reserved for future explicit broadcasts; columns currently created via REST.
    });
  });
}

function roomFor(boardId) {
  return `board:${boardId}`;
}
