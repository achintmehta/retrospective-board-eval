import { Server } from 'socket.io';
import { createCard, moveCard, createComment } from './queries.js';

export function registerSocket(server, db) {
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
      socket.data.boardId = boardId;
    });

    socket.on('add_card', ({ columnId, content, authorName }) => {
      const card = createCard(db, columnId, content, authorName);
      const boardId = socket.data.boardId;
      if (boardId) {
        io.to(boardId).emit('card_added', { columnId, card });
      }
    });

    socket.on('move_card', ({ cardId, targetColumnId, position }) => {
      moveCard(db, cardId, targetColumnId, position);
      const boardId = socket.data.boardId;
      if (boardId) {
        socket.to(boardId).emit('card_moved', { cardId, targetColumnId, position });
      }
    });

    socket.on('add_comment', ({ cardId, content, authorName }) => {
      const comment = createComment(db, cardId, content, authorName);
      const boardId = socket.data.boardId;
      if (boardId) {
        io.to(boardId).emit('comment_added', { cardId, comment });
      }
    });
  });

  return io;
}
