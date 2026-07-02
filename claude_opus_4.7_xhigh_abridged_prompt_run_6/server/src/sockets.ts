import type { Server, Socket } from 'socket.io';
import {
  addCard,
  addComment,
  getBoardIdForColumn,
  getBoardShallow,
  moveCard,
} from './repository.js';

type AckFn<T = unknown> = (payload: { ok: true; data?: T } | { ok: false; error: string }) => void;

function roomForBoard(boardId: string): string {
  return `board:${boardId}`;
}

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[socket] connected ${socket.id}`);

    socket.on('join_board', (boardId: string, ack?: AckFn) => {
      if (typeof boardId !== 'string' || !getBoardShallow(boardId)) {
        ack?.({ ok: false, error: 'board not found' });
        return;
      }
      socket.join(roomForBoard(boardId));
      ack?.({ ok: true });
    });

    socket.on('leave_board', (boardId: string) => {
      if (typeof boardId === 'string') socket.leave(roomForBoard(boardId));
    });

    socket.on(
      'add_card',
      (
        payload: {
          board_id: string;
          column_id: string;
          content: string;
          author_name: string;
        },
        ack?: AckFn
      ) => {
        try {
          const boardId = String(payload.board_id ?? '');
          const columnId = String(payload.column_id ?? '');
          const content = String(payload.content ?? '').trim();
          const author = String(payload.author_name ?? 'Anonymous').trim();
          if (!content) return ack?.({ ok: false, error: 'content is required' });
          const belongsTo = getBoardIdForColumn(columnId);
          if (!belongsTo || belongsTo !== boardId) {
            return ack?.({ ok: false, error: 'column not in board' });
          }
          const card = addCard(columnId, content, author);
          if (!card) return ack?.({ ok: false, error: 'column not found' });
          io.to(roomForBoard(boardId)).emit('card_added', {
            board_id: boardId,
            card,
          });
          ack?.({ ok: true, data: card });
        } catch (err) {
          console.error('add_card error', err);
          ack?.({ ok: false, error: 'internal error' });
        }
      }
    );

    socket.on(
      'move_card',
      (
        payload: {
          board_id: string;
          card_id: string;
          to_column_id: string;
          to_position: number;
        },
        ack?: AckFn
      ) => {
        try {
          const boardId = String(payload.board_id ?? '');
          const cardId = String(payload.card_id ?? '');
          const toColumnId = String(payload.to_column_id ?? '');
          const toPosition = Number.isFinite(payload.to_position)
            ? Math.max(0, Math.floor(payload.to_position))
            : 0;
          const targetBoard = getBoardIdForColumn(toColumnId);
          if (!targetBoard || targetBoard !== boardId) {
            return ack?.({ ok: false, error: 'column not in board' });
          }
          const result = moveCard(cardId, toColumnId, toPosition);
          if (!result) return ack?.({ ok: false, error: 'card not found' });
          io.to(roomForBoard(boardId)).emit('card_moved', {
            board_id: boardId,
            card: result.card,
          });
          ack?.({ ok: true, data: result.card });
        } catch (err) {
          console.error('move_card error', err);
          ack?.({ ok: false, error: 'internal error' });
        }
      }
    );

    socket.on(
      'add_comment',
      (
        payload: {
          board_id: string;
          card_id: string;
          content: string;
          author_name: string;
        },
        ack?: AckFn
      ) => {
        try {
          const boardId = String(payload.board_id ?? '');
          const cardId = String(payload.card_id ?? '');
          const content = String(payload.content ?? '').trim();
          const author = String(payload.author_name ?? 'Anonymous').trim();
          if (!content) return ack?.({ ok: false, error: 'content is required' });
          const comment = addComment(cardId, content, author);
          if (!comment) return ack?.({ ok: false, error: 'card not found' });
          if (comment.boardId !== boardId) {
            return ack?.({ ok: false, error: 'card not in board' });
          }
          const { boardId: _b, ...persisted } = comment;
          io.to(roomForBoard(boardId)).emit('comment_added', {
            board_id: boardId,
            comment: persisted,
          });
          ack?.({ ok: true, data: persisted });
        } catch (err) {
          console.error('add_comment error', err);
          ack?.({ ok: false, error: 'internal error' });
        }
      }
    );

    socket.on(
      'add_column',
      (
        payload: { board_id: string; title: string; accent?: string },
        ack?: AckFn
      ) => {
        // Column creation is delegated to REST but we still broadcast if needed.
        ack?.({ ok: false, error: 'use POST /api/boards/:id/columns' });
      }
    );

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected ${socket.id}`);
    });
  });
}

export function broadcastColumnAdded(
  io: Server,
  boardId: string,
  column: unknown
) {
  io.to(roomForBoard(boardId)).emit('column_added', { board_id: boardId, column });
}
