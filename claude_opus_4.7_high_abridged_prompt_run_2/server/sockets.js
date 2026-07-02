import { Server as SocketServer } from 'socket.io';
import { addCard, moveCard, addComment, getBoard } from './repository.js';

const BOARD_ROOM = (id) => `board:${id}`;

export function attachSockets(httpServer) {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    let currentBoardId = null;
    let displayName = 'Anonymous';

    socket.on('join_board', ({ boardId, displayName: name }, ack) => {
      try {
        if (!boardId) throw new Error('boardId required');
        const board = getBoard(boardId);
        if (!board) throw new Error('Board not found');
        if (currentBoardId) socket.leave(BOARD_ROOM(currentBoardId));
        currentBoardId = boardId;
        displayName = String(name || 'Anonymous').trim().slice(0, 40) || 'Anonymous';
        socket.join(BOARD_ROOM(boardId));

        // Notify others of presence
        socket.to(BOARD_ROOM(boardId)).emit('user_joined', { displayName });

        // Send count of participants
        const room = io.sockets.adapter.rooms.get(BOARD_ROOM(boardId));
        io.to(BOARD_ROOM(boardId)).emit('presence_update', {
          count: room ? room.size : 1,
        });

        ack?.({ ok: true, board });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('add_card', ({ columnId, content }, ack) => {
      try {
        if (!currentBoardId) throw new Error('Join a board first');
        const card = addCard({ columnId, content, authorName: displayName });
        io.to(BOARD_ROOM(currentBoardId)).emit('card_added', { card });
        ack?.({ ok: true, card });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('move_card', ({ cardId, toColumnId, toPosition }, ack) => {
      try {
        if (!currentBoardId) throw new Error('Join a board first');
        const result = moveCard({ cardId, toColumnId, toPosition });
        io.to(BOARD_ROOM(currentBoardId)).emit('card_moved', {
          cardId: result.cardId,
          fromColumnId: result.fromColumnId,
          toColumnId: result.toColumnId,
          toPosition: result.toPosition,
          movedBy: displayName,
        });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('add_comment', ({ cardId, content }, ack) => {
      try {
        if (!currentBoardId) throw new Error('Join a board first');
        const comment = addComment({ cardId, content, authorName: displayName });
        io.to(BOARD_ROOM(currentBoardId)).emit('comment_added', { comment });
        ack?.({ ok: true, comment });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (currentBoardId) {
        const room = io.sockets.adapter.rooms.get(BOARD_ROOM(currentBoardId));
        io.to(BOARD_ROOM(currentBoardId)).emit('presence_update', {
          count: room ? room.size : 0,
        });
        socket.to(BOARD_ROOM(currentBoardId)).emit('user_left', { displayName });
      }
    });
  });

  return io;
}
