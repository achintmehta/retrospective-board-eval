import type { Server, Socket } from 'socket.io';
import {
  createCard,
  createComment,
  getBoardIdForCard,
  getBoardIdForColumn,
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
  newPosition: number;
}
interface AddCommentPayload {
  boardId: string;
  cardId: string;
  content: string;
  authorName: string;
}

function boardRoom(boardId: string): string {
  return `board:${boardId}`;
}

export function registerBoardSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    let joinedBoard: string | null = null;

    socket.on('join_board', ({ boardId, displayName }: JoinPayload) => {
      if (!boardId) return;
      if (joinedBoard && joinedBoard !== boardId) {
        socket.leave(boardRoom(joinedBoard));
      }
      joinedBoard = boardId;
      socket.data.displayName = String(displayName ?? 'Guest').slice(0, 40);
      socket.join(boardRoom(boardId));
      socket.emit('joined_board', { boardId });
    });

    socket.on('add_card', (payload: AddCardPayload) => {
      const { boardId, columnId, content, authorName } = payload ?? {};
      if (!boardId || !columnId || !content?.trim()) return;
      const owningBoard = getBoardIdForColumn(columnId);
      if (owningBoard !== boardId) return;
      const card = createCard(
        columnId,
        content.slice(0, 500),
        authorName || socket.data.displayName || 'Guest'
      );
      if (!card) return;
      io.to(boardRoom(boardId)).emit('card_added', { card });
    });

    socket.on('move_card', (payload: MoveCardPayload) => {
      const { boardId, cardId, toColumnId, newPosition } = payload ?? {};
      if (!boardId || !cardId || !toColumnId || typeof newPosition !== 'number') return;
      const owningBoard = getBoardIdForColumn(toColumnId);
      if (owningBoard !== boardId) return;
      const result = moveCard(cardId, toColumnId, Math.max(0, newPosition));
      if (!result) return;
      io.to(boardRoom(boardId)).emit('card_moved', {
        cardId,
        toColumnId,
        newPosition: result.card.position,
      });
    });

    socket.on('add_comment', (payload: AddCommentPayload) => {
      const { boardId, cardId, content, authorName } = payload ?? {};
      if (!boardId || !cardId || !content?.trim()) return;
      const owningBoard = getBoardIdForCard(cardId);
      if (owningBoard !== boardId) return;
      const comment = createComment(
        cardId,
        content.slice(0, 500),
        authorName || socket.data.displayName || 'Guest'
      );
      if (!comment) return;
      io.to(boardRoom(boardId)).emit('comment_added', { comment });
    });
  });
}
