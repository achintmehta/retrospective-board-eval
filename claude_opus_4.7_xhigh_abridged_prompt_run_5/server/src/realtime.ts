import type { Server as HTTPServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import {
  createCard,
  createColumn,
  createComment,
  getBoard,
  moveCard,
} from './repository.js';

/**
 * Payload contracts. Kept intentionally small — the server is the source of
 * truth, so mutations are echoed back as `_added` / `_moved` events with the
 * canonical row (including server-assigned id, position, created_at).
 */
type JoinBoard = { boardId: string };
type LeaveBoard = { boardId: string };
type AddCard = { boardId: string; columnId: string; content: string; authorName: string };
type MoveCardEvent = { boardId: string; cardId: string; targetColumnId: string; targetPosition: number | null };
type AddComment = { boardId: string; cardId: string; content: string; authorName: string };
type AddColumn = { boardId: string; title: string };

const roomFor = (boardId: string) => `board:${boardId}`;

const trim = (v: unknown, max: number) => {
  const s = String(v ?? '').trim();
  return s.length === 0 ? null : s.slice(0, max);
};

export function initRealtime(server: HTTPServer): IOServer {
  const io = new IOServer(server, {
    cors: { origin: true, credentials: true },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join_board', (payload: JoinBoard, ack?: (r: unknown) => void) => {
      const boardId = String(payload?.boardId ?? '');
      if (!boardId || !getBoard(boardId)) {
        ack?.({ ok: false, error: 'board not found' });
        return;
      }
      socket.join(roomFor(boardId));
      ack?.({ ok: true });
    });

    socket.on('leave_board', (payload: LeaveBoard) => {
      const boardId = String(payload?.boardId ?? '');
      if (boardId) socket.leave(roomFor(boardId));
    });

    socket.on('add_card', (payload: AddCard, ack?: (r: unknown) => void) => {
      const content = trim(payload?.content, 500);
      const authorName = trim(payload?.authorName, 60);
      const boardId = String(payload?.boardId ?? '');
      const columnId = String(payload?.columnId ?? '');
      if (!content || !authorName || !boardId || !columnId) {
        ack?.({ ok: false, error: 'invalid payload' });
        return;
      }
      const card = createCard(columnId, content, authorName);
      if (!card) {
        ack?.({ ok: false, error: 'column not found' });
        return;
      }
      io.to(roomFor(boardId)).emit('card_added', { boardId, card });
      ack?.({ ok: true, card });
    });

    socket.on('move_card', (payload: MoveCardEvent, ack?: (r: unknown) => void) => {
      const boardId = String(payload?.boardId ?? '');
      const cardId = String(payload?.cardId ?? '');
      const targetColumnId = String(payload?.targetColumnId ?? '');
      const targetPosition =
        payload?.targetPosition == null ? null : Number(payload.targetPosition);
      if (!boardId || !cardId || !targetColumnId) {
        ack?.({ ok: false, error: 'invalid payload' });
        return;
      }
      const card = moveCard(cardId, targetColumnId, targetPosition);
      if (!card) {
        ack?.({ ok: false, error: 'card or column not found' });
        return;
      }
      io.to(roomFor(boardId)).emit('card_moved', { boardId, card });
      ack?.({ ok: true, card });
    });

    socket.on('add_comment', (payload: AddComment, ack?: (r: unknown) => void) => {
      const content = trim(payload?.content, 500);
      const authorName = trim(payload?.authorName, 60);
      const boardId = String(payload?.boardId ?? '');
      const cardId = String(payload?.cardId ?? '');
      if (!content || !authorName || !boardId || !cardId) {
        ack?.({ ok: false, error: 'invalid payload' });
        return;
      }
      const comment = createComment(cardId, content, authorName);
      if (!comment) {
        ack?.({ ok: false, error: 'card not found' });
        return;
      }
      io.to(roomFor(boardId)).emit('comment_added', { boardId, comment });
      ack?.({ ok: true, comment });
    });

    socket.on('add_column', (payload: AddColumn, ack?: (r: unknown) => void) => {
      const boardId = String(payload?.boardId ?? '');
      const title = trim(payload?.title, 60);
      if (!boardId || !title) {
        ack?.({ ok: false, error: 'invalid payload' });
        return;
      }
      const column = createColumn(boardId, title);
      if (!column) {
        ack?.({ ok: false, error: 'board not found' });
        return;
      }
      io.to(roomFor(boardId)).emit('column_added', { boardId, column });
      ack?.({ ok: true, column });
    });
  });

  return io;
}
