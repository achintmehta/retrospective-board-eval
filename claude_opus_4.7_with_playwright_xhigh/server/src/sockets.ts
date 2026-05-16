import type { Server, Socket } from 'socket.io';
import {
  getBoardSummary,
  getColumn,
  getCard,
  addCard,
  moveCard,
  addComment,
} from './db.js';

interface JoinPayload {
  boardId: string;
  displayName: string;
}

interface AddCardPayload {
  boardId: string;
  columnId: string;
  content: string;
  authorName: string;
}

interface MoveCardPayload {
  boardId: string;
  cardId: string;
  toColumnId: string;
  toPosition: number;
}

interface AddCommentPayload {
  boardId: string;
  cardId: string;
  content: string;
  authorName: string;
}

function roomFor(boardId: string): string {
  return `board:${boardId}`;
}

export function registerSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    socket.on('join_board', async (payload: JoinPayload, ack?: (res: unknown) => void) => {
      try {
        const board = await getBoardSummary(payload.boardId);
        if (!board) {
          ack?.({ ok: false, error: 'board not found' });
          return;
        }
        socket.join(roomFor(payload.boardId));
        socket.data.displayName = payload.displayName;
        socket.data.boardId = payload.boardId;
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('add_card', async (payload: AddCardPayload, ack?: (res: unknown) => void) => {
      try {
        const content = String(payload.content ?? '').trim();
        const authorName = String(payload.authorName ?? '').trim();
        if (!content || !authorName) {
          ack?.({ ok: false, error: 'content and authorName are required' });
          return;
        }
        const column = await getColumn(payload.columnId);
        if (!column || column.board_id !== payload.boardId) {
          ack?.({ ok: false, error: 'column not found' });
          return;
        }
        const card = await addCard({
          columnId: payload.columnId,
          content,
          authorName,
        });
        io.to(roomFor(payload.boardId)).emit('card_added', { card });
        ack?.({ ok: true, card });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('move_card', async (payload: MoveCardPayload, ack?: (res: unknown) => void) => {
      try {
        const targetCol = await getColumn(payload.toColumnId);
        if (!targetCol || targetCol.board_id !== payload.boardId) {
          ack?.({ ok: false, error: 'target column not found' });
          return;
        }
        const updated = await moveCard({
          cardId: payload.cardId,
          toColumnId: payload.toColumnId,
          toPosition: Math.max(0, Math.floor(payload.toPosition ?? 0)),
        });
        if (!updated) {
          ack?.({ ok: false, error: 'card not found' });
          return;
        }
        io.to(roomFor(payload.boardId)).emit('card_moved', {
          cardId: updated.id,
          toColumnId: updated.column_id,
          toPosition: updated.position,
        });
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });

    socket.on('add_comment', async (payload: AddCommentPayload, ack?: (res: unknown) => void) => {
      try {
        const content = String(payload.content ?? '').trim();
        const authorName = String(payload.authorName ?? '').trim();
        if (!content || !authorName) {
          ack?.({ ok: false, error: 'content and authorName are required' });
          return;
        }
        const card = await getCard(payload.cardId);
        if (!card) {
          ack?.({ ok: false, error: 'card not found' });
          return;
        }
        const comment = await addComment({
          cardId: payload.cardId,
          content,
          authorName,
        });
        if (!comment) {
          ack?.({ ok: false, error: 'unable to create comment' });
          return;
        }
        io.to(roomFor(payload.boardId)).emit('comment_added', { comment });
        ack?.({ ok: true, comment });
      } catch (err) {
        ack?.({ ok: false, error: (err as Error).message });
      }
    });
  });
}
