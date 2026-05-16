import type { Server, Socket } from 'socket.io';
import {
  addCard,
  addComment,
  getCardBoardId,
  getColumnBoardId,
  moveCard,
} from '../repository.js';

interface JoinPayload {
  boardId: string;
  displayName?: string;
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
    socket.on('join_board', (payload: JoinPayload, ack?: (r: unknown) => void) => {
      if (!payload?.boardId) {
        ack?.({ ok: false, error: 'boardId required' });
        return;
      }
      socket.join(roomFor(payload.boardId));
      socket.data.displayName = payload.displayName ?? 'Guest';
      ack?.({ ok: true });
    });

    socket.on('leave_board', (payload: { boardId: string }) => {
      if (payload?.boardId) socket.leave(roomFor(payload.boardId));
    });

    socket.on('add_card', (payload: AddCardPayload, ack?: (r: unknown) => void) => {
      const { boardId, columnId, content, authorName } = payload ?? ({} as AddCardPayload);
      if (!boardId || !columnId || !content?.trim() || !authorName?.trim()) {
        ack?.({ ok: false, error: 'missing fields' });
        return;
      }
      const ownerBoardId = getColumnBoardId(columnId);
      if (ownerBoardId !== boardId) {
        ack?.({ ok: false, error: 'column not in board' });
        return;
      }
      const card = addCard(columnId, content.trim(), authorName.trim());
      if (!card) {
        ack?.({ ok: false, error: 'failed to add card' });
        return;
      }
      io.to(roomFor(boardId)).emit('card_added', { columnId, card });
      ack?.({ ok: true, card });
    });

    socket.on('move_card', (payload: MoveCardPayload, ack?: (r: unknown) => void) => {
      const { boardId, cardId, toColumnId, toPosition } = payload ?? ({} as MoveCardPayload);
      if (!boardId || !cardId || !toColumnId || typeof toPosition !== 'number') {
        ack?.({ ok: false, error: 'missing fields' });
        return;
      }
      const cardBoardId = getCardBoardId(cardId);
      const targetBoardId = getColumnBoardId(toColumnId);
      if (cardBoardId !== boardId || targetBoardId !== boardId) {
        ack?.({ ok: false, error: 'card or column not in board' });
        return;
      }
      const result = moveCard(cardId, toColumnId, toPosition);
      if (!result) {
        ack?.({ ok: false, error: 'move failed' });
        return;
      }
      io.to(roomFor(boardId)).emit('card_moved', {
        card: result.card,
        fromColumnId: result.fromColumnId,
        toColumnId: result.toColumnId,
      });
      ack?.({ ok: true });
    });

    socket.on('add_comment', (payload: AddCommentPayload, ack?: (r: unknown) => void) => {
      const { boardId, cardId, content, authorName } = payload ?? ({} as AddCommentPayload);
      if (!boardId || !cardId || !content?.trim() || !authorName?.trim()) {
        ack?.({ ok: false, error: 'missing fields' });
        return;
      }
      const cardBoardId = getCardBoardId(cardId);
      if (cardBoardId !== boardId) {
        ack?.({ ok: false, error: 'card not in board' });
        return;
      }
      const comment = addComment(cardId, content.trim(), authorName.trim());
      if (!comment) {
        ack?.({ ok: false, error: 'failed to add comment' });
        return;
      }
      io.to(roomFor(boardId)).emit('comment_added', { cardId, comment });
      ack?.({ ok: true, comment });
    });
  });
}
