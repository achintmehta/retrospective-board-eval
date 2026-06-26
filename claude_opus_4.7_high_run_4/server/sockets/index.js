// Socket.io event handlers. The server is the source of truth: writes happen
// here, then we broadcast the persisted entity back to every client in the
// board room (including the sender, so optimistic UI can reconcile).

function roomFor(boardId) {
  return `board:${boardId}`;
}

function registerSocketHandlers(io, repo) {
  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = null;

    socket.on('join_board', ({ boardId, name }, ack) => {
      if (typeof boardId !== 'string' || !boardId) {
        return ack?.({ ok: false, error: 'boardId is required' });
      }
      if (typeof name !== 'string' || !name.trim()) {
        return ack?.({ ok: false, error: 'name is required' });
      }
      const board = repo.getBoard(boardId);
      if (!board) return ack?.({ ok: false, error: 'board not found' });

      if (joinedBoardId && joinedBoardId !== boardId) {
        socket.leave(roomFor(joinedBoardId));
      }
      joinedBoardId = boardId;
      displayName = name.trim();
      socket.join(roomFor(boardId));
      socket
        .to(roomFor(boardId))
        .emit('presence_joined', { name: displayName });
      ack?.({ ok: true, board });
    });

    function requireMembership(ack) {
      if (!joinedBoardId || !displayName) {
        ack?.({ ok: false, error: 'join_board first' });
        return false;
      }
      return true;
    }

    socket.on('add_card', ({ columnId, content }, ack) => {
      if (!requireMembership(ack)) return;
      if (typeof columnId !== 'string' || !columnId) {
        return ack?.({ ok: false, error: 'columnId is required' });
      }
      if (typeof content !== 'string' || !content.trim()) {
        return ack?.({ ok: false, error: 'content is required' });
      }
      const column = repo.getColumn(columnId);
      if (!column) return ack?.({ ok: false, error: 'column not found' });

      const card = repo.createCard({
        columnId,
        content: content.trim(),
        authorName: displayName,
      });
      const payload = { ...card, comments: [] };
      io.to(roomFor(joinedBoardId)).emit('card_added', payload);
      ack?.({ ok: true, card: payload });
    });

    socket.on('move_card', ({ cardId, toColumnId, toPosition }, ack) => {
      if (!requireMembership(ack)) return;
      if (typeof cardId !== 'string' || !cardId) {
        return ack?.({ ok: false, error: 'cardId is required' });
      }
      if (typeof toColumnId !== 'string' || !toColumnId) {
        return ack?.({ ok: false, error: 'toColumnId is required' });
      }
      const targetColumn = repo.getColumn(toColumnId);
      if (!targetColumn)
        return ack?.({ ok: false, error: 'column not found' });
      const card = repo.getCard(cardId);
      if (!card) return ack?.({ ok: false, error: 'card not found' });

      const previousColumnId = card.column_id;
      const updated = repo.moveCard({
        cardId,
        toColumnId,
        toPosition: Number.isInteger(toPosition) ? toPosition : 0,
      });
      io.to(roomFor(joinedBoardId)).emit('card_moved', {
        cardId,
        fromColumnId: previousColumnId,
        toColumnId: updated.column_id,
        toPosition: updated.position,
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', ({ cardId, content }, ack) => {
      if (!requireMembership(ack)) return;
      if (typeof cardId !== 'string' || !cardId) {
        return ack?.({ ok: false, error: 'cardId is required' });
      }
      if (typeof content !== 'string' || !content.trim()) {
        return ack?.({ ok: false, error: 'content is required' });
      }
      const card = repo.getCard(cardId);
      if (!card) return ack?.({ ok: false, error: 'card not found' });

      const comment = repo.createComment({
        cardId,
        content: content.trim(),
        authorName: displayName,
      });
      io.to(roomFor(joinedBoardId)).emit('comment_added', comment);
      ack?.({ ok: true, comment });
    });

    socket.on('disconnect', () => {
      if (joinedBoardId && displayName) {
        socket
          .to(roomFor(joinedBoardId))
          .emit('presence_left', { name: displayName });
      }
    });
  });
}

module.exports = registerSocketHandlers;
