// Socket.io event handlers. The server is the single source of truth:
// every client mutation is acked by a DB write, then a broadcast to the
// board room. Optimistic UI on the client is fine — broadcasts re-sync.
import {
  boardsRepo,
  columnsRepo,
  cardsRepo,
  commentsRepo,
} from './db.js';

const MAX_CARD_CONTENT = 500;
const MAX_COMMENT_CONTENT = 1000;
const MAX_NAME = 60;

function roomFor(boardId) {
  return `board:${boardId}`;
}

function asString(value, max) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

function emitError(socket, message) {
  socket.emit('error_message', { message });
}

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // We track each socket's joined board(s) so we can leave properly on disconnect.
    socket.data.boards = new Set();
    socket.data.displayName = null;

    socket.on('join_board', ({ board_id, display_name } = {}) => {
      if (!board_id || !boardsRepo.exists(board_id)) {
        return emitError(socket, 'Board not found');
      }
      const name = asString(display_name, MAX_NAME);
      if (!name) return emitError(socket, 'Display name required');

      socket.data.displayName = name;
      const room = roomFor(board_id);
      socket.join(room);
      socket.data.boards.add(board_id);
      // Tell the rest of the room someone joined (could be surfaced in UI later).
      socket.to(room).emit('user_joined', { display_name: name });
    });

    socket.on('leave_board', ({ board_id } = {}) => {
      if (!board_id) return;
      socket.leave(roomFor(board_id));
      socket.data.boards.delete(board_id);
    });

    socket.on('add_card', ({ board_id, column_id, content, author_name } = {}) => {
      try {
        if (!socket.data.boards.has(board_id)) return emitError(socket, 'You must join the board first');
        const columnBoard = columnsRepo.boardIdOf(column_id);
        if (columnBoard !== board_id) return emitError(socket, 'Column does not belong to board');
        const text = asString(content, MAX_CARD_CONTENT);
        if (!text) return emitError(socket, `Card content is required (max ${MAX_CARD_CONTENT} chars)`);
        const author = asString(author_name, MAX_NAME) || socket.data.displayName || 'Anonymous';

        const card = cardsRepo.create({ column_id, content: text, author_name: author });
        io.to(roomFor(board_id)).emit('card_added', card);
      } catch (err) {
        emitError(socket, err.message || 'Failed to add card');
      }
    });

    socket.on('move_card', ({ board_id, card_id, from_column_id, to_column_id, to_position } = {}) => {
      try {
        if (!socket.data.boards.has(board_id)) return emitError(socket, 'You must join the board first');
        if (typeof card_id !== 'number') return emitError(socket, 'card_id must be a number');
        if (typeof to_column_id !== 'number') return emitError(socket, 'to_column_id must be a number');
        if (typeof to_position !== 'number' || to_position < 0) return emitError(socket, 'to_position must be a non-negative number');
        if (cardsRepo.boardIdOf(card_id) !== board_id) return emitError(socket, 'Card does not belong to board');
        if (columnsRepo.boardIdOf(to_column_id) !== board_id) return emitError(socket, 'Target column not in board');

        const result = cardsRepo.move({ card_id, to_column_id, to_position });
        if (!result) return emitError(socket, 'Card not found');

        io.to(roomFor(board_id)).emit('card_moved', {
          card_id,
          from_column_id: result.from_column_id,
          to_column_id: result.to_column_id,
          ordered_cards: result.ordered_cards,
          source_ordered_cards: result.source_ordered_cards,
        });
        // For cross-column moves, also broadcast a "source list reorder" so
        // clients can re-pin positions in the column the card just left.
        if (result.from_column_id !== result.to_column_id) {
          io.to(roomFor(board_id)).emit('column_reordered', {
            column_id: result.from_column_id,
            ordered_cards: result.source_ordered_cards,
          });
        }
      } catch (err) {
        emitError(socket, err.message || 'Failed to move card');
      }
    });

    socket.on('add_comment', ({ board_id, card_id, content, author_name } = {}) => {
      try {
        if (!socket.data.boards.has(board_id)) return emitError(socket, 'You must join the board first');
        if (cardsRepo.boardIdOf(card_id) !== board_id) return emitError(socket, 'Card does not belong to board');
        const text = asString(content, MAX_COMMENT_CONTENT);
        if (!text) return emitError(socket, `Comment content is required (max ${MAX_COMMENT_CONTENT} chars)`);
        const author = asString(author_name, MAX_NAME) || socket.data.displayName || 'Anonymous';

        const comment = commentsRepo.create({ card_id, content: text, author_name: author });
        io.to(roomFor(board_id)).emit('comment_added', comment);
      } catch (err) {
        emitError(socket, err.message || 'Failed to add comment');
      }
    });

    socket.on('disconnect', () => {
      // Rooms get cleaned up automatically; nothing else to do.
      socket.data.boards.clear();
    });
  });
}
