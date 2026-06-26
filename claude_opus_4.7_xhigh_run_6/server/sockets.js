const {
  createCard,
  moveCard,
  createComment,
  getBoardMeta,
  getBoardIdForColumn,
} = require('./db');

function boardRoom(boardId) {
  return `board:${boardId}`;
}

function attachSockets(io) {
  io.on('connection', (socket) => {
    socket.data.boards = new Set();

    socket.on('join_board', (boardId, ack) => {
      if (!boardId || typeof boardId !== 'string') {
        ack?.({ ok: false, error: 'boardId required' });
        return;
      }
      const board = getBoardMeta(boardId);
      if (!board) {
        ack?.({ ok: false, error: 'board not found' });
        return;
      }
      socket.join(boardRoom(boardId));
      socket.data.boards.add(boardId);
      ack?.({ ok: true });
    });

    socket.on('leave_board', (boardId) => {
      if (!boardId) return;
      socket.leave(boardRoom(boardId));
      socket.data.boards.delete(boardId);
    });

    socket.on('add_card', (payload, ack) => {
      try {
        const columnId = payload?.columnId;
        const content = (payload?.content || '').toString().trim();
        const authorName = (payload?.authorName || 'Anonymous').toString().trim() || 'Anonymous';
        if (!columnId || !content) {
          ack?.({ ok: false, error: 'columnId and content required' });
          return;
        }
        const boardId = getBoardIdForColumn(columnId);
        if (!boardId) {
          ack?.({ ok: false, error: 'column not found' });
          return;
        }
        const card = createCard({ columnId, content, authorName });
        if (!card) {
          ack?.({ ok: false, error: 'failed to create card' });
          return;
        }
        const broadcast = {
          board_id: boardId,
          column_id: card.column_id,
          card: {
            id: card.id,
            column_id: card.column_id,
            content: card.content,
            author_name: card.author_name,
            created_at: card.created_at,
            position: card.position,
            comments: [],
          },
        };
        io.to(boardRoom(boardId)).emit('card_added', broadcast);
        ack?.({ ok: true, card: broadcast.card });
      } catch (err) {
        console.error('add_card error', err);
        ack?.({ ok: false, error: 'server error' });
      }
    });

    socket.on('move_card', (payload, ack) => {
      try {
        const cardId = payload?.cardId;
        const toColumnId = payload?.toColumnId;
        const toIndex = Number.isFinite(payload?.toIndex) ? payload.toIndex : 0;
        if (!cardId || !toColumnId) {
          ack?.({ ok: false, error: 'cardId and toColumnId required' });
          return;
        }
        const result = moveCard({ cardId, toColumnId, toIndex });
        if (!result) {
          ack?.({ ok: false, error: 'card or column not found' });
          return;
        }
        const broadcast = {
          board_id: result.board_id,
          card_id: cardId,
          from_column_id: result.from_column_id,
          to_column_id: result.to_column_id,
          to_index: toIndex,
        };
        io.to(boardRoom(result.board_id)).emit('card_moved', broadcast);
        ack?.({ ok: true });
      } catch (err) {
        console.error('move_card error', err);
        ack?.({ ok: false, error: 'server error' });
      }
    });

    socket.on('add_comment', (payload, ack) => {
      try {
        const cardId = payload?.cardId;
        const content = (payload?.content || '').toString().trim();
        const authorName = (payload?.authorName || 'Anonymous').toString().trim() || 'Anonymous';
        if (!cardId || !content) {
          ack?.({ ok: false, error: 'cardId and content required' });
          return;
        }
        const comment = createComment({ cardId, content, authorName });
        if (!comment) {
          ack?.({ ok: false, error: 'card not found' });
          return;
        }
        const broadcast = {
          board_id: comment.board_id,
          card_id: cardId,
          comment: {
            id: comment.id,
            card_id: comment.card_id,
            content: comment.content,
            author_name: comment.author_name,
            created_at: comment.created_at,
          },
        };
        io.to(boardRoom(comment.board_id)).emit('comment_added', broadcast);
        ack?.({ ok: true, comment: broadcast.comment });
      } catch (err) {
        console.error('add_comment error', err);
        ack?.({ ok: false, error: 'server error' });
      }
    });
  });
}

module.exports = { attachSockets };
