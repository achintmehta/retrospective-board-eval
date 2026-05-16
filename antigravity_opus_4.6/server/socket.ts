import { Server as SocketIOServer, Socket } from 'socket.io';
import Database from 'better-sqlite3';
import { createCard, moveCard, createComment } from './queries';

export function setupSocketHandlers(io: SocketIOServer, db: Database.Database): void {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Room joining for boards
    socket.on('join_board', (boardId: string) => {
      socket.join(`board:${boardId}`);
      console.log(`[Socket] ${socket.id} joined board:${boardId}`);
    });

    socket.on('leave_board', (boardId: string) => {
      socket.leave(`board:${boardId}`);
      console.log(`[Socket] ${socket.id} left board:${boardId}`);
    });

    // Handle add_card event
    socket.on('add_card', (data: {
      boardId: string;
      columnId: string;
      content: string;
      authorName: string;
    }) => {
      try {
        const card = createCard(db, data.columnId, data.content, data.authorName);
        io.to(`board:${data.boardId}`).emit('card_added', {
          ...card,
          comments: [],
        });
      } catch (err) {
        console.error('[Socket] Error adding card:', err);
        socket.emit('error', { message: 'Failed to add card' });
      }
    });

    // Handle move_card event
    socket.on('move_card', (data: {
      boardId: string;
      cardId: string;
      targetColumnId: string;
      newPosition: number;
    }) => {
      try {
        const card = moveCard(db, data.cardId, data.targetColumnId, data.newPosition);
        if (card) {
          io.to(`board:${data.boardId}`).emit('card_moved', {
            cardId: data.cardId,
            targetColumnId: data.targetColumnId,
            newPosition: data.newPosition,
          });
        }
      } catch (err) {
        console.error('[Socket] Error moving card:', err);
        socket.emit('error', { message: 'Failed to move card' });
      }
    });

    // Handle add_comment event
    socket.on('add_comment', (data: {
      boardId: string;
      cardId: string;
      content: string;
      authorName: string;
    }) => {
      try {
        const comment = createComment(db, data.cardId, data.content, data.authorName);
        io.to(`board:${data.boardId}`).emit('comment_added', {
          cardId: data.cardId,
          comment,
        });
      } catch (err) {
        console.error('[Socket] Error adding comment:', err);
        socket.emit('error', { message: 'Failed to add comment' });
      }
    });

    // Handle column_added event (broadcast new column to all clients)
    socket.on('add_column', (data: {
      boardId: string;
      column: any;
    }) => {
      socket.to(`board:${data.boardId}`).emit('column_added', data.column);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
