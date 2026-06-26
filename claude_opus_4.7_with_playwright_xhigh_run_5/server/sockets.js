const repo = require('./repository');

function boardRoom(boardId) {
  return `board:${boardId}`;
}

/**
 * Wires up Socket.io handlers for a board. The server is the source of truth:
 * clients emit intent events (add_card, move_card, add_comment), the server
 * persists, then broadcasts the canonical result to everyone in the room.
 */
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boards = new Set();

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId) {
        if (ack) ack({ ok: false, error: 'boardId required' });
        return;
      }
      const board = repo.getBoardSummary(boardId);
      if (!board) {
        if (ack) ack({ ok: false, error: 'board not found' });
        return;
      }
      socket.data.displayName = (displayName || 'Guest').toString().slice(0, 80);
      socket.join(boardRoom(boardId));
      socket.data.boards.add(boardId);
      if (ack) ack({ ok: true });
    });

    socket.on('leave_board', ({ boardId }) => {
      if (!boardId) return;
      socket.leave(boardRoom(boardId));
      socket.data.boards.delete(boardId);
    });

    socket.on('add_card', ({ boardId, columnId, content }, ack) => {
      const text = (content || '').toString().trim();
      if (!boardId || !columnId || !text) {
        if (ack) ack({ ok: false, error: 'columnId and content required' });
        return;
      }
      const author = socket.data.displayName || 'Guest';
      const card = repo.createCard(columnId, text, author);
      if (!card || card.board_id !== boardId) {
        if (ack) ack({ ok: false, error: 'column not found' });
        return;
      }
      io.to(boardRoom(boardId)).emit('card_added', card);
      if (ack) ack({ ok: true, card });
    });

    socket.on('move_card', ({ boardId, cardId, targetColumnId, targetIndex }, ack) => {
      if (!boardId || !cardId || !targetColumnId) {
        if (ack) ack({ ok: false, error: 'cardId and targetColumnId required' });
        return;
      }
      const result = repo.moveCard(cardId, targetColumnId, targetIndex);
      if (!result || result.card.board_id !== boardId) {
        if (ack) ack({ ok: false, error: 'move failed' });
        return;
      }
      io.to(boardRoom(boardId)).emit('card_moved', {
        card: result.card,
        sourceColumnId: result.sourceColumnId,
        targetColumnId: result.targetColumnId,
      });
      if (ack) ack({ ok: true });
    });

    socket.on('add_comment', ({ boardId, cardId, content }, ack) => {
      const text = (content || '').toString().trim();
      if (!boardId || !cardId || !text) {
        if (ack) ack({ ok: false, error: 'cardId and content required' });
        return;
      }
      const author = socket.data.displayName || 'Guest';
      const comment = repo.createComment(cardId, text, author);
      if (!comment || comment.board_id !== boardId) {
        if (ack) ack({ ok: false, error: 'card not found' });
        return;
      }
      io.to(boardRoom(boardId)).emit('comment_added', comment);
      if (ack) ack({ ok: true, comment });
    });
  });
}

function broadcastToBoard(io) {
  return (boardId, event, payload) => {
    io.to(boardRoom(boardId)).emit(event, payload);
  };
}

module.exports = { registerSocketHandlers, broadcastToBoard, boardRoom };
