import {
  createCard,
  moveCard,
  createComment,
  ValidationError,
  NotFoundError,
} from './repository.js';

const PARTICIPANTS = new Map(); // boardId -> Map<socketId, displayName>

function roomFor(boardId) {
  return `board:${boardId}`;
}

function participantList(boardId) {
  const room = PARTICIPANTS.get(boardId);
  if (!room) return [];
  return [...room.entries()].map(([socketId, name]) => ({ socketId, name }));
}

function ackErr(ack, err) {
  if (typeof ack !== 'function') return;
  const status = err?.status || 500;
  const message = err?.message || 'Internal error';
  ack({ ok: false, error: message, status });
}

function ackOk(ack, data) {
  if (typeof ack === 'function') ack({ ok: true, data });
}

export function attachSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.data.boardId = null;
    socket.data.displayName = null;

    socket.on('join_board', ({ boardId, displayName }, ack) => {
      try {
        if (!boardId) throw new ValidationError('boardId required');
        const name = String(displayName || '').trim() || 'Guest';

        // Leave previous board if any
        if (socket.data.boardId && socket.data.boardId !== boardId) {
          leaveBoard(socket, io);
        }

        socket.join(roomFor(boardId));
        socket.data.boardId = boardId;
        socket.data.displayName = name;

        if (!PARTICIPANTS.has(boardId)) PARTICIPANTS.set(boardId, new Map());
        PARTICIPANTS.get(boardId).set(socket.id, name);

        io.to(roomFor(boardId)).emit('participants_updated', participantList(boardId));
        ackOk(ack, { boardId, participants: participantList(boardId) });
      } catch (err) {
        ackErr(ack, err);
      }
    });

    socket.on('leave_board', (_payload, ack) => {
      leaveBoard(socket, io);
      ackOk(ack, true);
    });

    socket.on('add_card', ({ boardId, columnId, content }, ack) => {
      try {
        const author = socket.data.displayName || 'Guest';
        const card = createCard({ boardId, columnId, content, authorName: author });
        io.to(roomFor(boardId)).emit('card_added', card);
        ackOk(ack, card);
      } catch (err) {
        if (!(err instanceof ValidationError || err instanceof NotFoundError)) {
          console.error('[socket] add_card error:', err);
        }
        ackErr(ack, err);
      }
    });

    socket.on('move_card', ({ boardId, cardId, toColumnId, toIndex }, ack) => {
      try {
        const result = moveCard({ boardId, cardId, toColumnId, toIndex });
        io.to(roomFor(boardId)).emit('card_moved', {
          cardId,
          fromColumnId: result.fromColumnId,
          toColumnId: result.toColumnId,
          columnOrders: result.columnOrders,
          card: result.card,
        });
        ackOk(ack, result);
      } catch (err) {
        if (!(err instanceof ValidationError || err instanceof NotFoundError)) {
          console.error('[socket] move_card error:', err);
        }
        ackErr(ack, err);
      }
    });

    socket.on('add_comment', ({ boardId, cardId, content }, ack) => {
      try {
        const author = socket.data.displayName || 'Guest';
        const comment = createComment({ boardId, cardId, content, authorName: author });
        io.to(roomFor(boardId)).emit('comment_added', comment);
        ackOk(ack, comment);
      } catch (err) {
        if (!(err instanceof ValidationError || err instanceof NotFoundError)) {
          console.error('[socket] add_comment error:', err);
        }
        ackErr(ack, err);
      }
    });

    socket.on('disconnect', () => {
      leaveBoard(socket, io);
    });
  });
}

function leaveBoard(socket, io) {
  const boardId = socket.data.boardId;
  if (!boardId) return;
  socket.leave(roomFor(boardId));
  const room = PARTICIPANTS.get(boardId);
  if (room) {
    room.delete(socket.id);
    if (room.size === 0) PARTICIPANTS.delete(boardId);
  }
  io.to(roomFor(boardId)).emit('participants_updated', participantList(boardId));
  socket.data.boardId = null;
  socket.data.displayName = null;
}
