const queries = require('../db/queries');

const MAX_CARD_CONTENT = 2000;
const MAX_COMMENT_CONTENT = 2000;
const MAX_AUTHOR_NAME = 80;

function roomFor(boardId) {
  return `board:${boardId}`;
}

function ackError(ack, message) {
  if (typeof ack === 'function') ack({ ok: false, error: message });
}

function ackOk(ack, payload) {
  if (typeof ack === 'function') ack({ ok: true, ...payload });
}

function normalize(str, max) {
  if (typeof str !== 'string') return '';
  const trimmed = str.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // The client supplies its display name on join. We store it on the socket
    // so all subsequent actions are stamped with it server-side.
    socket.data.displayName = '';
    socket.data.boardId = '';

    socket.on('join_board', ({ boardId, displayName } = {}, ack) => {
      if (!boardId || typeof boardId !== 'string') {
        return ackError(ack, 'boardId is required.');
      }
      const name = normalize(displayName, MAX_AUTHOR_NAME);
      if (!name) return ackError(ack, 'displayName is required.');

      const board = queries.getFullBoard(boardId);
      if (!board) return ackError(ack, 'Board not found.');

      // Leave the previous board room if any
      if (socket.data.boardId && socket.data.boardId !== boardId) {
        socket.leave(roomFor(socket.data.boardId));
      }

      socket.data.displayName = name;
      socket.data.boardId = boardId;
      socket.join(roomFor(boardId));

      // Send the latest board state so the client can sync after reconnects
      ackOk(ack, { board });

      socket.to(roomFor(boardId)).emit('presence_join', {
        socketId: socket.id,
        displayName: name,
      });
    });

    socket.on('leave_board', (_payload, ack) => {
      const { boardId, displayName } = socket.data;
      if (boardId) {
        socket.leave(roomFor(boardId));
        io.to(roomFor(boardId)).emit('presence_leave', {
          socketId: socket.id,
          displayName,
        });
      }
      socket.data.boardId = '';
      ackOk(ack, {});
    });

    socket.on('add_card', ({ columnId, content } = {}, ack) => {
      if (!socket.data.boardId) return ackError(ack, 'Not joined to a board.');
      const text = normalize(content, MAX_CARD_CONTENT);
      if (!text) return ackError(ack, 'Card content is required.');
      if (!columnId) return ackError(ack, 'columnId is required.');

      const column = queries.getColumn(columnId);
      if (!column || column.board_id !== socket.data.boardId) {
        return ackError(ack, 'Column does not belong to the current board.');
      }

      const card = queries.createCard({
        columnId,
        content: text,
        authorName: socket.data.displayName,
      });
      if (!card) return ackError(ack, 'Failed to create card.');

      io.to(roomFor(socket.data.boardId)).emit('card_added', card);
      ackOk(ack, { card });
    });

    socket.on('move_card', ({ cardId, toColumnId, toIndex } = {}, ack) => {
      if (!socket.data.boardId) return ackError(ack, 'Not joined to a board.');
      if (!cardId || !toColumnId) {
        return ackError(ack, 'cardId and toColumnId are required.');
      }

      const card = queries.getCard(cardId);
      if (!card) return ackError(ack, 'Card not found.');
      const destCol = queries.getColumn(toColumnId);
      if (!destCol || destCol.board_id !== socket.data.boardId) {
        return ackError(ack, 'Destination column not in current board.');
      }

      const updated = queries.moveCard({
        cardId,
        toColumnId,
        toIndex: Number.isFinite(toIndex) ? toIndex : 0,
      });
      if (!updated) return ackError(ack, 'Failed to move card.');

      io.to(roomFor(socket.data.boardId)).emit('card_moved', {
        cardId: updated.id,
        fromColumnId: card.column_id,
        toColumnId: updated.column_id,
        position: updated.position,
      });
      ackOk(ack, { card: updated });
    });

    socket.on('add_comment', ({ cardId, content } = {}, ack) => {
      if (!socket.data.boardId) return ackError(ack, 'Not joined to a board.');
      const text = normalize(content, MAX_COMMENT_CONTENT);
      if (!text) return ackError(ack, 'Comment content is required.');
      if (!cardId) return ackError(ack, 'cardId is required.');

      const card = queries.getCard(cardId);
      if (!card) return ackError(ack, 'Card not found.');
      const column = queries.getColumn(card.column_id);
      if (!column || column.board_id !== socket.data.boardId) {
        return ackError(ack, 'Card does not belong to current board.');
      }

      const comment = queries.createComment({
        cardId,
        content: text,
        authorName: socket.data.displayName,
      });
      if (!comment) return ackError(ack, 'Failed to add comment.');

      io.to(roomFor(socket.data.boardId)).emit('comment_added', comment);
      ackOk(ack, { comment });
    });

    socket.on('disconnect', () => {
      const { boardId, displayName } = socket.data;
      if (boardId) {
        io.to(roomFor(boardId)).emit('presence_leave', {
          socketId: socket.id,
          displayName,
        });
      }
    });
  });
}

module.exports = registerSocketHandlers;
