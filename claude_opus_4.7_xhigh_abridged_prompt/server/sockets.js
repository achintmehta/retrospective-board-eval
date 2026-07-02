import * as repo from './repo.js';

const MAX_CARD_LEN = 2000;
const MAX_COMMENT_LEN = 1000;
const MAX_NAME_LEN = 60;

function sanitize(str, max) {
  return String(str ?? '').trim().slice(0, max);
}

export function attachSockets(io) {
  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = null;

    const roomName = (boardId) => `board:${boardId}`;

    const emitPresence = () => {
      if (!joinedBoardId) return;
      const room = io.sockets.adapter.rooms.get(roomName(joinedBoardId));
      const users = [];
      if (room) {
        for (const socketId of room) {
          const s = io.sockets.sockets.get(socketId);
          if (s?.data?.displayName) {
            users.push({ id: socketId, displayName: s.data.displayName });
          }
        }
      }
      io.to(roomName(joinedBoardId)).emit('presence', { users });
    };

    socket.on('join_board', ({ boardId, displayName: name } = {}, ack) => {
      const cleanBoardId = String(boardId ?? '').trim();
      const cleanName = sanitize(name, MAX_NAME_LEN);
      if (!cleanBoardId || !cleanName) {
        return ack?.({ ok: false, error: 'boardId and displayName are required' });
      }
      const board = repo.getBoard(cleanBoardId);
      if (!board) return ack?.({ ok: false, error: 'Board not found' });

      if (joinedBoardId && joinedBoardId !== cleanBoardId) {
        socket.leave(roomName(joinedBoardId));
      }
      socket.join(roomName(cleanBoardId));
      joinedBoardId = cleanBoardId;
      displayName = cleanName;
      socket.data.displayName = cleanName;
      socket.data.boardId = cleanBoardId;

      ack?.({ ok: true, board });
      emitPresence();
    });

    socket.on('add_card', ({ columnId, content } = {}, ack) => {
      if (!joinedBoardId || !displayName)
        return ack?.({ ok: false, error: 'Not joined to a board' });
      const cleanContent = sanitize(content, MAX_CARD_LEN);
      if (!cleanContent) return ack?.({ ok: false, error: 'Content is required' });
      const result = repo.addCard({
        columnId: String(columnId ?? ''),
        content: cleanContent,
        authorName: displayName,
      });
      if (!result) return ack?.({ ok: false, error: 'Column not found' });
      if (result.boardId !== joinedBoardId)
        return ack?.({ ok: false, error: 'Column does not belong to your board' });
      io.to(roomName(joinedBoardId)).emit('card_added', { card: result.card });
      ack?.({ ok: true, card: result.card });
    });

    socket.on('move_card', ({ cardId, toColumnId, toIndex } = {}, ack) => {
      if (!joinedBoardId) return ack?.({ ok: false, error: 'Not joined to a board' });
      const result = repo.moveCard({
        cardId: String(cardId ?? ''),
        toColumnId: String(toColumnId ?? ''),
        toIndex: Number.isFinite(toIndex) ? Number(toIndex) : undefined,
      });
      if (!result) return ack?.({ ok: false, error: 'Card or column not found' });
      if (result.boardId !== joinedBoardId)
        return ack?.({ ok: false, error: 'Card does not belong to your board' });
      io.to(roomName(joinedBoardId)).emit('card_moved', { card: result.card });
      ack?.({ ok: true });
    });

    socket.on('add_comment', ({ cardId, content } = {}, ack) => {
      if (!joinedBoardId || !displayName)
        return ack?.({ ok: false, error: 'Not joined to a board' });
      const cleanContent = sanitize(content, MAX_COMMENT_LEN);
      if (!cleanContent) return ack?.({ ok: false, error: 'Content is required' });
      const result = repo.addComment({
        cardId: String(cardId ?? ''),
        content: cleanContent,
        authorName: displayName,
      });
      if (!result) return ack?.({ ok: false, error: 'Card not found' });
      if (result.boardId !== joinedBoardId)
        return ack?.({ ok: false, error: 'Card does not belong to your board' });
      io.to(roomName(joinedBoardId)).emit('comment_added', { comment: result.comment });
      ack?.({ ok: true, comment: result.comment });
    });

    socket.on('add_column', ({ title } = {}, ack) => {
      if (!joinedBoardId) return ack?.({ ok: false, error: 'Not joined to a board' });
      const cleanTitle = sanitize(title, 60);
      if (!cleanTitle) return ack?.({ ok: false, error: 'Column title is required' });
      const column = repo.addColumn(joinedBoardId, cleanTitle);
      if (!column) return ack?.({ ok: false, error: 'Board not found' });
      io.to(roomName(joinedBoardId)).emit('column_added', { column });
      ack?.({ ok: true, column });
    });

    socket.on('disconnect', () => {
      if (joinedBoardId) emitPresence();
    });
  });
}
