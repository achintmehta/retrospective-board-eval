import { Server } from 'socket.io';
import { addCard, moveCard, addComment, getBoardSummary } from './repository.js';

export function attachRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = null;

    socket.on('join_board', ({ boardId, displayName: name }, ack) => {
      const board = getBoardSummary(boardId);
      if (!board) {
        if (typeof ack === 'function') ack({ ok: false, error: 'Board not found' });
        return;
      }
      if (joinedBoardId) socket.leave(joinedBoardId);
      joinedBoardId = boardId;
      displayName = (name || 'Guest').toString().slice(0, 40) || 'Guest';
      socket.join(boardId);
      io.to(boardId).emit('presence_update', {
        boardId,
        // socket count is approximate; just useful as a presence hint
        connected: io.sockets.adapter.rooms.get(boardId)?.size || 0,
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('add_card', ({ columnId, content }, ack) => {
      if (!joinedBoardId) return;
      const text = (content || '').toString().trim();
      if (!text) return;
      const result = addCard({
        columnId,
        content: text.slice(0, 1000),
        authorName: displayName || 'Guest',
      });
      if (!result || result.boardId !== joinedBoardId) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }
      io.to(result.boardId).emit('card_added', { card: result.card });
      if (typeof ack === 'function') ack({ ok: true, card: result.card });
    });

    socket.on('move_card', ({ cardId, toColumnId, toPosition }, ack) => {
      if (!joinedBoardId) return;
      const result = moveCard({
        cardId,
        toColumnId,
        toPosition: Number.isInteger(toPosition) ? toPosition : 0,
      });
      if (!result || result.boardId !== joinedBoardId) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }
      io.to(result.boardId).emit('card_moved', {
        cardId: result.cardId,
        fromColumnId: result.fromColumnId,
        toColumnId: result.toColumnId,
        toPosition: result.toPosition,
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('add_comment', ({ cardId, content }, ack) => {
      if (!joinedBoardId) return;
      const text = (content || '').toString().trim();
      if (!text) return;
      const result = addComment({
        cardId,
        content: text.slice(0, 1000),
        authorName: displayName || 'Guest',
      });
      if (!result || result.boardId !== joinedBoardId) {
        if (typeof ack === 'function') ack({ ok: false });
        return;
      }
      io.to(result.boardId).emit('comment_added', { comment: result.comment });
      if (typeof ack === 'function') ack({ ok: true, comment: result.comment });
    });

    socket.on('disconnect', () => {
      if (joinedBoardId) {
        io.to(joinedBoardId).emit('presence_update', {
          boardId: joinedBoardId,
          connected: io.sockets.adapter.rooms.get(joinedBoardId)?.size || 0,
        });
      }
    });
  });

  return io;
}
