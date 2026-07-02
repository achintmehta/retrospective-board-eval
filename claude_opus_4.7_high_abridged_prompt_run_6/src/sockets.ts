import type { Server as SocketIOServer, Socket } from 'socket.io';
import { addCard, addComment, moveCard } from './db.js';

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

function roomFor(boardId: string) {
  return `board:${boardId}`;
}

const MAX_CONTENT = 1000;

function sanitize(text: unknown, max = MAX_CONTENT): string | null {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function registerSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    let joinedBoardId: string | null = null;
    let displayName: string | null = null;

    socket.on('join_board', (payload: JoinPayload) => {
      if (!payload?.boardId || !payload?.displayName) return;
      joinedBoardId = payload.boardId;
      displayName = String(payload.displayName).slice(0, 50);
      socket.join(roomFor(joinedBoardId));
      socket.emit('joined', { boardId: joinedBoardId });
    });

    socket.on('add_card', (payload: AddCardPayload) => {
      const content = sanitize(payload?.content);
      const author =
        sanitize(payload?.authorName, 50) ?? sanitize(displayName ?? '', 50);
      if (!content || !author || !payload?.columnId) return;
      const card = addCard(payload.columnId, content, author);
      if (!card) return;
      io.to(roomFor(card.board_id)).emit('card_added', {
        boardId: card.board_id,
        columnId: card.column_id,
        card: {
          id: card.id,
          column_id: card.column_id,
          content: card.content,
          author_name: card.author_name,
          created_at: card.created_at,
          position: card.position,
          comments: [],
        },
      });
    });

    socket.on('move_card', (payload: MoveCardPayload) => {
      if (
        !payload?.cardId ||
        !payload?.toColumnId ||
        typeof payload?.toPosition !== 'number'
      )
        return;
      const result = moveCard(
        payload.cardId,
        payload.toColumnId,
        payload.toPosition
      );
      if (!result) return;
      io.to(roomFor(result.boardId)).emit('card_moved', {
        boardId: result.boardId,
        columnOrder: result.columnOrder,
      });
    });

    socket.on('add_comment', (payload: AddCommentPayload) => {
      const content = sanitize(payload?.content, 500);
      const author =
        sanitize(payload?.authorName, 50) ?? sanitize(displayName ?? '', 50);
      if (!content || !author || !payload?.cardId) return;
      const comment = addComment(payload.cardId, content, author);
      if (!comment) return;
      io.to(roomFor(comment.board_id)).emit('comment_added', {
        boardId: comment.board_id,
        cardId: comment.card_id,
        comment: {
          id: comment.id,
          card_id: comment.card_id,
          content: comment.content,
          author_name: comment.author_name,
          created_at: comment.created_at,
        },
      });
    });

    socket.on('disconnect', () => {
      if (joinedBoardId) socket.leave(roomFor(joinedBoardId));
    });
  });
}
