import { Server } from 'socket.io';
import {
  createCard,
  moveCard,
  createComment,
  createColumn
} from './db.js';

const MAX_CARD_LEN = 500;
const MAX_COMMENT_LEN = 500;
const MAX_NAME_LEN = 40;
const MAX_COLUMN_TITLE_LEN = 60;

function sanitizeName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_NAME_LEN);
}

function room(boardId) {
  return `board:${boardId}`;
}

export function attachSockets(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true }
  });

  io.on('connection', (socket) => {
    let currentBoardId = null;

    socket.on('join_board', ({ boardId }) => {
      if (!boardId || typeof boardId !== 'string') return;
      if (currentBoardId) socket.leave(room(currentBoardId));
      currentBoardId = boardId;
      socket.join(room(boardId));
      const presenceCount = io.sockets.adapter.rooms.get(room(boardId))?.size ?? 1;
      io.to(room(boardId)).emit('presence', { count: presenceCount });
    });

    socket.on('add_card', ({ columnId, content, authorName }, ack) => {
      const cleanName = sanitizeName(authorName);
      const cleanContent = String(content ?? '').trim().slice(0, MAX_CARD_LEN);
      if (!cleanName || !cleanContent || !columnId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid_input' });
        return;
      }
      const card = createCard({ columnId, content: cleanContent, authorName: cleanName });
      if (!card) {
        if (typeof ack === 'function') ack({ ok: false, error: 'column_not_found' });
        return;
      }
      io.to(room(card.board_id)).emit('card_added', card);
      if (typeof ack === 'function') ack({ ok: true, card });
    });

    socket.on('move_card', ({ cardId, toColumnId, toIndex }, ack) => {
      if (!cardId || !toColumnId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid_input' });
        return;
      }
      const updated = moveCard({
        cardId,
        toColumnId,
        toIndex: Number.isInteger(toIndex) ? toIndex : 0
      });
      if (!updated) {
        if (typeof ack === 'function') ack({ ok: false, error: 'card_or_column_not_found' });
        return;
      }
      io.to(room(updated.board_id)).emit('card_moved', {
        cardId: updated.id,
        toColumnId: updated.column_id,
        position: updated.position
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('add_comment', ({ cardId, content, authorName }, ack) => {
      const cleanName = sanitizeName(authorName);
      const cleanContent = String(content ?? '').trim().slice(0, MAX_COMMENT_LEN);
      if (!cleanName || !cleanContent || !cardId) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid_input' });
        return;
      }
      const comment = createComment({ cardId, content: cleanContent, authorName: cleanName });
      if (!comment) {
        if (typeof ack === 'function') ack({ ok: false, error: 'card_not_found' });
        return;
      }
      io.to(room(comment.board_id)).emit('comment_added', comment);
      if (typeof ack === 'function') ack({ ok: true, comment });
    });

    socket.on('add_column', ({ boardId, title }, ack) => {
      const cleanTitle = String(title ?? '').trim().slice(0, MAX_COLUMN_TITLE_LEN);
      if (!boardId || !cleanTitle) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid_input' });
        return;
      }
      const column = createColumn(boardId, cleanTitle);
      if (!column) {
        if (typeof ack === 'function') ack({ ok: false, error: 'board_not_found' });
        return;
      }
      io.to(room(boardId)).emit('column_added', column);
      if (typeof ack === 'function') ack({ ok: true, column });
    });

    socket.on('disconnect', () => {
      if (currentBoardId) {
        const presenceCount = io.sockets.adapter.rooms.get(room(currentBoardId))?.size ?? 0;
        io.to(room(currentBoardId)).emit('presence', { count: presenceCount });
      }
    });
  });

  return io;
}
