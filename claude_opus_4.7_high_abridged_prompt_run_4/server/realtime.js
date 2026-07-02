import { Server as IOServer } from 'socket.io';
import {
  addCard,
  moveCard,
  addComment,
  getBoardIdForCard,
  getBoardSummary,
} from './db.js';

const MAX_CONTENT = 2000;
const MAX_NAME = 60;

const clean = (v, max) => {
  const s = String(v ?? '').trim();
  return s.slice(0, max);
};

function room(boardId) {
  return `board:${boardId}`;
}

export function attachRealtime(httpServer) {
  const io = new IOServer(httpServer, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    let joinedBoardId = null;
    let displayName = 'Guest';

    socket.on('join_board', ({ boardId, displayName: name }, ack) => {
      const board = getBoardSummary(boardId);
      if (!board) {
        ack?.({ ok: false, error: 'board not found' });
        return;
      }
      if (joinedBoardId && joinedBoardId !== boardId) {
        socket.leave(room(joinedBoardId));
      }
      joinedBoardId = boardId;
      displayName = clean(name, MAX_NAME) || 'Guest';
      socket.join(room(boardId));
      ack?.({ ok: true });

      const clients = io.sockets.adapter.rooms.get(room(boardId));
      io.to(room(boardId)).emit('presence', {
        boardId,
        count: clients?.size ?? 1,
      });
    });

    socket.on('add_card', (payload, ack) => {
      const { columnId } = payload ?? {};
      const content = clean(payload?.content, MAX_CONTENT);
      const authorName = clean(payload?.authorName ?? displayName, MAX_NAME);
      if (!columnId || !content) {
        ack?.({ ok: false, error: 'invalid payload' });
        return;
      }
      const card = addCard({ columnId, content, authorName });
      if (!card) {
        ack?.({ ok: false, error: 'column not found' });
        return;
      }
      io.to(room(card.board_id)).emit('card_added', card);
      ack?.({ ok: true, card });
    });

    socket.on('move_card', (payload, ack) => {
      const { cardId, targetColumnId } = payload ?? {};
      const targetIndex = Number.isFinite(payload?.targetIndex)
        ? payload.targetIndex
        : 0;
      if (!cardId || !targetColumnId) {
        ack?.({ ok: false, error: 'invalid payload' });
        return;
      }
      const result = moveCard({ cardId, targetColumnId, targetIndex });
      if (!result) {
        ack?.({ ok: false, error: 'card or column not found' });
        return;
      }
      io.to(room(result.board_id)).emit('card_moved', result);
      ack?.({ ok: true });
    });

    socket.on('add_comment', (payload, ack) => {
      const { cardId } = payload ?? {};
      const content = clean(payload?.content, MAX_CONTENT);
      const authorName = clean(payload?.authorName ?? displayName, MAX_NAME);
      if (!cardId || !content) {
        ack?.({ ok: false, error: 'invalid payload' });
        return;
      }
      const boardId = getBoardIdForCard(cardId);
      if (!boardId) {
        ack?.({ ok: false, error: 'card not found' });
        return;
      }
      const comment = addComment({ cardId, content, authorName });
      io.to(room(boardId)).emit('comment_added', comment);
      ack?.({ ok: true, comment });
    });

    socket.on('disconnect', () => {
      if (!joinedBoardId) return;
      const clients = io.sockets.adapter.rooms.get(room(joinedBoardId));
      io.to(room(joinedBoardId)).emit('presence', {
        boardId: joinedBoardId,
        count: clients?.size ?? 0,
      });
    });
  });

  return io;
}
