const repo = require('../db/repository');

function sanitizeName(name) {
  return String(name || '').trim().slice(0, 40);
}

function sanitizeContent(content, max = 2000) {
  return String(content || '').trim().slice(0, max);
}

function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boardRoom = null;

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId) return ack?.({ ok: false, error: 'boardId required' });
      const board = repo.getBoard(boardId);
      if (!board) return ack?.({ ok: false, error: 'board not found' });

      const name = sanitizeName(displayName) || 'Guest';
      const room = `board:${boardId}`;

      if (socket.data.boardRoom && socket.data.boardRoom !== room) {
        socket.leave(socket.data.boardRoom);
      }
      socket.join(room);
      socket.data.boardRoom = room;
      socket.data.boardId = boardId;
      socket.data.displayName = name;

      socket.to(room).emit('presence_joined', { displayName: name });
      ack?.({ ok: true, board });
    });

    socket.on('add_card', ({ columnId, content }, ack) => {
      const text = sanitizeContent(content);
      if (!text) return ack?.({ ok: false, error: 'content required' });
      if (!socket.data.boardId) return ack?.({ ok: false, error: 'join a board first' });

      const card = repo.addCard({
        columnId,
        content: text,
        authorName: socket.data.displayName || 'Guest',
      });
      if (!card) return ack?.({ ok: false, error: 'column not found' });
      if (card.board_id !== socket.data.boardId) {
        return ack?.({ ok: false, error: 'column belongs to different board' });
      }
      const payload = {
        id: card.id,
        column_id: card.column_id,
        content: card.content,
        author_name: card.author_name,
        position: card.position,
        created_at: card.created_at,
        comments: [],
      };
      io.to(`board:${card.board_id}`).emit('card_added', payload);
      ack?.({ ok: true, card: payload });
    });

    socket.on('move_card', ({ cardId, targetColumnId, targetIndex }, ack) => {
      if (!socket.data.boardId) return ack?.({ ok: false, error: 'join a board first' });
      const result = repo.moveCard({
        cardId,
        targetColumnId,
        targetIndex: Number(targetIndex) || 0,
      });
      if (!result) return ack?.({ ok: false, error: 'card or column not found' });
      if (result.boardId !== socket.data.boardId) {
        return ack?.({ ok: false, error: 'cross-board move not allowed' });
      }
      io.to(`board:${result.boardId}`).emit('card_moved', {
        cardId: result.cardId,
        sourceColumnId: result.sourceColumnId,
        targetColumnId: result.targetColumnId,
        targetIndex: result.targetIndex,
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', ({ cardId, content }, ack) => {
      const text = sanitizeContent(content, 1000);
      if (!text) return ack?.({ ok: false, error: 'content required' });
      if (!socket.data.boardId) return ack?.({ ok: false, error: 'join a board first' });

      const comment = repo.addComment({
        cardId,
        content: text,
        authorName: socket.data.displayName || 'Guest',
      });
      if (!comment) return ack?.({ ok: false, error: 'card not found' });
      if (comment.board_id !== socket.data.boardId) {
        return ack?.({ ok: false, error: 'card belongs to different board' });
      }
      const payload = {
        id: comment.id,
        card_id: comment.card_id,
        content: comment.content,
        author_name: comment.author_name,
        created_at: comment.created_at,
      };
      io.to(`board:${comment.board_id}`).emit('comment_added', payload);
      ack?.({ ok: true, comment: payload });
    });

    socket.on('disconnect', () => {
      if (socket.data.boardRoom && socket.data.displayName) {
        socket.to(socket.data.boardRoom).emit('presence_left', {
          displayName: socket.data.displayName,
        });
      }
    });
  });
}

module.exports = { attachSocketHandlers };
