import { createCard, moveCard, createComment } from './queries.js';

export function registerSocketHandlers(io, db) {
  io.on('connection', (socket) => {
    socket.on('join_board', (boardId) => {
      socket.join(boardId);
    });

    socket.on('add_card', ({ boardId, columnId, content, authorName }) => {
      const card = createCard(db, columnId, content, authorName);
      card.comments = [];
      io.to(boardId).emit('card_added', { columnId, card });
    });

    socket.on('move_card', ({ boardId, cardId, newColumnId, newPosition }) => {
      const result = moveCard(db, cardId, newColumnId, newPosition);
      io.to(boardId).emit('card_moved', { cardId, newColumnId, newPosition });
    });

    socket.on('add_comment', ({ boardId, cardId, content, authorName }) => {
      const comment = createComment(db, cardId, content, authorName);
      io.to(boardId).emit('comment_added', { cardId, comment });
    });
  });
}
