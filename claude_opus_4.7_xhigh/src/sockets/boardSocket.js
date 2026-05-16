import {
  getBoardSummary,
  createCard,
  moveCard,
  createComment,
  getColumn,
  getCard,
} from '../db/repository.js';

// Each board has its own Socket.io room so events only fan out to clients
// viewing that board.
const roomFor = (boardId) => `board:${boardId}`;

function ack(callback, payload) {
  if (typeof callback === 'function') callback(payload);
}

export function registerBoardSocket(io) {
  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = null;

    socket.on('join_board', async ({ boardId, name }, callback) => {
      try {
        const id = Number(boardId);
        if (!Number.isInteger(id)) {
          return ack(callback, { ok: false, error: 'invalid boardId' });
        }
        const trimmedName = (name ?? '').toString().trim();
        if (!trimmedName) {
          return ack(callback, { ok: false, error: 'display name is required' });
        }
        const board = await getBoardSummary(id);
        if (!board) {
          return ack(callback, { ok: false, error: 'board not found' });
        }
        if (joinedBoardId && joinedBoardId !== id) {
          socket.leave(roomFor(joinedBoardId));
        }
        joinedBoardId = id;
        displayName = trimmedName;
        socket.join(roomFor(id));
        ack(callback, { ok: true });
      } catch (err) {
        ack(callback, { ok: false, error: err.message });
      }
    });

    socket.on('add_card', async ({ columnId, content }, callback) => {
      try {
        if (!joinedBoardId || !displayName) {
          return ack(callback, { ok: false, error: 'must join a board first' });
        }
        const colId = Number(columnId);
        const text = (content ?? '').toString().trim();
        if (!Number.isInteger(colId)) {
          return ack(callback, { ok: false, error: 'invalid columnId' });
        }
        if (!text) {
          return ack(callback, { ok: false, error: 'content is required' });
        }
        const column = await getColumn(colId);
        if (!column || column.board_id !== joinedBoardId) {
          return ack(callback, { ok: false, error: 'column not found on this board' });
        }
        const card = await createCard({
          columnId: colId,
          content: text,
          authorName: displayName,
        });
        io.to(roomFor(joinedBoardId)).emit('card_added', card);
        ack(callback, { ok: true, card });
      } catch (err) {
        ack(callback, { ok: false, error: err.message });
      }
    });

    socket.on('move_card', async ({ cardId, toColumnId, position }, callback) => {
      try {
        if (!joinedBoardId) {
          return ack(callback, { ok: false, error: 'must join a board first' });
        }
        const id = Number(cardId);
        const colId = Number(toColumnId);
        const pos = Number(position);
        if (!Number.isInteger(id) || !Number.isInteger(colId) || !Number.isInteger(pos)) {
          return ack(callback, { ok: false, error: 'invalid payload' });
        }
        const targetCol = await getColumn(colId);
        if (!targetCol || targetCol.board_id !== joinedBoardId) {
          return ack(callback, { ok: false, error: 'target column not on this board' });
        }
        const existing = await getCard(id);
        if (!existing) {
          return ack(callback, { ok: false, error: 'card not found' });
        }
        const fromColumnId = existing.column_id;
        const moved = await moveCard({ cardId: id, toColumnId: colId, position: Math.max(0, pos) });
        io.to(roomFor(joinedBoardId)).emit('card_moved', {
          cardId: moved.id,
          fromColumnId,
          toColumnId: moved.column_id,
          position: moved.position,
        });
        ack(callback, { ok: true });
      } catch (err) {
        ack(callback, { ok: false, error: err.message });
      }
    });

    socket.on('add_comment', async ({ cardId, content }, callback) => {
      try {
        if (!joinedBoardId || !displayName) {
          return ack(callback, { ok: false, error: 'must join a board first' });
        }
        const id = Number(cardId);
        const text = (content ?? '').toString().trim();
        if (!Number.isInteger(id)) {
          return ack(callback, { ok: false, error: 'invalid cardId' });
        }
        if (!text) {
          return ack(callback, { ok: false, error: 'content is required' });
        }
        // Confirm card belongs to a column on the joined board.
        const card = await getCard(id);
        if (!card) {
          return ack(callback, { ok: false, error: 'card not found' });
        }
        const col = await getColumn(card.column_id);
        if (!col || col.board_id !== joinedBoardId) {
          return ack(callback, { ok: false, error: 'card not on this board' });
        }
        const comment = await createComment({
          cardId: id,
          content: text,
          authorName: displayName,
        });
        io.to(roomFor(joinedBoardId)).emit('comment_added', comment);
        ack(callback, { ok: true, comment });
      } catch (err) {
        ack(callback, { ok: false, error: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (joinedBoardId) socket.leave(roomFor(joinedBoardId));
    });
  });
}
