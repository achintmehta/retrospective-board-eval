import {
  createCard,
  moveCard,
  createComment,
  getCard,
  getColumn
} from './repository.js';

const ROOM_PREFIX = 'board:';
const boardRoom = (boardId) => `${ROOM_PREFIX}${boardId}`;

const safeAck = (ack, payload) => {
  if (typeof ack === 'function') ack(payload);
};

/**
 * Wire Socket.io events for collaborative board interactions.
 *
 *   join_board            -> client subscribes to a board's room
 *   leave_board           -> client unsubscribes
 *   add_card              -> creates a card, broadcasts `card_added`
 *   move_card             -> moves a card, broadcasts `card_moved`
 *   add_comment           -> creates a comment, broadcasts `comment_added`
 *   presence              -> # of clients in the room is broadcast as `presence_updated`
 */
export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = null;

    const emitPresence = (boardId) => {
      const room = io.sockets.adapter.rooms.get(boardRoom(boardId));
      const count = room ? room.size : 0;
      io.to(boardRoom(boardId)).emit('presence_updated', {
        boardId,
        count
      });
    };

    // 5.2 Join a board room
    socket.on('join_board', ({ boardId, name } = {}, ack) => {
      if (!boardId) {
        safeAck(ack, { ok: false, error: 'boardId is required' });
        return;
      }

      if (joinedBoardId && joinedBoardId !== boardId) {
        socket.leave(boardRoom(joinedBoardId));
        emitPresence(joinedBoardId);
      }

      displayName = (name || '').trim() || displayName || 'Guest';
      joinedBoardId = boardId;
      socket.join(boardRoom(boardId));
      socket.data.boardId = boardId;
      socket.data.displayName = displayName;

      safeAck(ack, { ok: true });
      emitPresence(boardId);
    });

    socket.on('leave_board', (_payload, ack) => {
      if (joinedBoardId) {
        socket.leave(boardRoom(joinedBoardId));
        const leaving = joinedBoardId;
        joinedBoardId = null;
        emitPresence(leaving);
      }
      safeAck(ack, { ok: true });
    });

    // 5.3 add_card
    socket.on('add_card', (payload = {}, ack) => {
      try {
        const { columnId, content } = payload;
        const author = (payload.authorName || displayName || '').trim();
        if (!author) throw new Error('Display name required to add cards');

        const column = getColumn(columnId);
        if (!column) throw new Error('Column not found');

        const card = createCard(columnId, content, author);
        io.to(boardRoom(column.boardId)).emit('card_added', { card });
        safeAck(ack, { ok: true, card });
      } catch (err) {
        safeAck(ack, { ok: false, error: err.message });
      }
    });

    // 5.4 move_card
    socket.on('move_card', (payload = {}, ack) => {
      try {
        const { cardId, toColumnId, toIndex } = payload;
        if (!cardId || !toColumnId) {
          throw new Error('cardId and toColumnId are required');
        }
        const idx = Number.isFinite(toIndex) ? Math.max(0, Math.floor(toIndex)) : 0;
        const result = moveCard(cardId, toColumnId, idx);
        io.to(boardRoom(result.boardId)).emit('card_moved', {
          cardId: result.cardId,
          fromColumnId: result.fromColumnId,
          toColumnId: result.toColumnId,
          toIndex: idx
        });
        safeAck(ack, { ok: true });
      } catch (err) {
        safeAck(ack, { ok: false, error: err.message });
      }
    });

    // 5.5 add_comment
    socket.on('add_comment', (payload = {}, ack) => {
      try {
        const { cardId, content } = payload;
        const author = (payload.authorName || displayName || '').trim();
        if (!author) throw new Error('Display name required to comment');

        const card = getCard(cardId);
        if (!card) throw new Error('Card not found');
        const column = getColumn(card.columnId);

        const comment = createComment(cardId, content, author);
        const boardId = column ? column.boardId : null;
        if (boardId) {
          io.to(boardRoom(boardId)).emit('comment_added', { comment });
        }
        safeAck(ack, { ok: true, comment });
      } catch (err) {
        safeAck(ack, { ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (joinedBoardId) {
        emitPresence(joinedBoardId);
      }
    });
  });
}
