const {
  createCard,
  moveCard,
  createComment,
  getBoardIdForColumn,
  getBoardIdForCard,
} = require('./store');

function boardRoom(boardId) {
  return `board:${boardId}`;
}

function attachSockets(io) {
  io.on('connection', (socket) => {
    socket.data.presence = new Map(); // boardId -> displayName

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      if (!boardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'boardId required' });
        return;
      }
      const room = boardRoom(boardId);
      socket.join(room);
      socket.data.presence.set(boardId, displayName || 'Anonymous');

      const peerCount = io.sockets.adapter.rooms.get(room)?.size || 1;
      io.to(room).emit('presence_update', { boardId, peerCount });

      socket.to(room).emit('peer_joined', { boardId, displayName: displayName || 'Anonymous' });
      if (typeof ack === 'function') ack({ ok: true, peerCount });
    });

    socket.on('leave_board', ({ boardId }) => {
      if (!boardId) return;
      const room = boardRoom(boardId);
      socket.leave(room);
      socket.data.presence.delete(boardId);
      const peerCount = io.sockets.adapter.rooms.get(room)?.size || 0;
      io.to(room).emit('presence_update', { boardId, peerCount });
    });

    socket.on('add_card', (payload, ack) => {
      try {
        const card = createCard({
          columnId: payload?.columnId,
          content: payload?.content,
          authorName: payload?.authorName,
        });
        if (!card) {
          if (typeof ack === 'function') ack({ ok: false, error: 'invalid card payload' });
          return;
        }
        io.to(boardRoom(card.boardId)).emit('card_added', { card });
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        console.error('add_card failed', err);
        if (typeof ack === 'function') ack({ ok: false, error: 'server error' });
      }
    });

    socket.on('move_card', (payload, ack) => {
      try {
        const { cardId, toColumnId, toIndex } = payload || {};
        const card = moveCard({ cardId, toColumnId, toIndex });
        if (!card) {
          if (typeof ack === 'function') ack({ ok: false, error: 'invalid move payload' });
          return;
        }
        io.to(boardRoom(card.boardId)).emit('card_moved', {
          cardId: card.id,
          toColumnId: card.column_id,
          toIndex,
          position: card.position,
        });
        if (typeof ack === 'function') ack({ ok: true, card });
      } catch (err) {
        console.error('move_card failed', err);
        if (typeof ack === 'function') ack({ ok: false, error: 'server error' });
      }
    });

    socket.on('add_comment', (payload, ack) => {
      try {
        const comment = createComment({
          cardId: payload?.cardId,
          content: payload?.content,
          authorName: payload?.authorName,
        });
        if (!comment) {
          if (typeof ack === 'function') ack({ ok: false, error: 'invalid comment payload' });
          return;
        }
        io.to(boardRoom(comment.boardId)).emit('comment_added', { comment });
        if (typeof ack === 'function') ack({ ok: true, comment });
      } catch (err) {
        console.error('add_comment failed', err);
        if (typeof ack === 'function') ack({ ok: false, error: 'server error' });
      }
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('board:')) continue;
        const boardId = room.slice('board:'.length);
        const peerCount = (io.sockets.adapter.rooms.get(room)?.size || 1) - 1;
        socket.to(room).emit('presence_update', { boardId, peerCount });
      }
    });
  });
}

module.exports = { attachSockets };
