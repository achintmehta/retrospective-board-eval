import type { Server as IoServer, Socket } from "socket.io";
import { createCard, createComment, getBoard, moveCard } from "./repo.js";

type JoinPayload = { boardId: string; displayName: string };
type AddCardPayload = {
  boardId: string;
  columnId: string;
  content: string;
  authorName: string;
};
type MoveCardPayload = {
  boardId: string;
  cardId: string;
  targetColumnId: string;
  targetIndex: number;
};
type AddCommentPayload = {
  boardId: string;
  cardId: string;
  content: string;
  authorName: string;
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function boardRoom(boardId: string): string {
  return `board:${boardId}`;
}

export function registerSocketHandlers(io: IoServer): void {
  io.on("connection", (socket: Socket) => {
    socket.data.boards = new Set<string>();

    socket.on("join_board", (payload: JoinPayload, ack?: (response: unknown) => void) => {
      if (!payload || !isString(payload.boardId)) {
        ack?.({ ok: false, error: "Invalid board id" });
        return;
      }
      const board = getBoard(payload.boardId);
      if (!board) {
        ack?.({ ok: false, error: "Board not found" });
        return;
      }
      socket.join(boardRoom(payload.boardId));
      (socket.data.boards as Set<string>).add(payload.boardId);
      ack?.({ ok: true, board });
    });

    socket.on("leave_board", (payload: { boardId: string }) => {
      if (!payload || !isString(payload.boardId)) return;
      socket.leave(boardRoom(payload.boardId));
      (socket.data.boards as Set<string>).delete(payload.boardId);
    });

    socket.on(
      "add_card",
      (payload: AddCardPayload, ack?: (response: unknown) => void) => {
        if (
          !payload ||
          !isString(payload.boardId) ||
          !isString(payload.columnId) ||
          !isString(payload.content) ||
          !isString(payload.authorName)
        ) {
          ack?.({ ok: false, error: "Invalid payload" });
          return;
        }
        const content = payload.content.trim();
        const authorName = payload.authorName.trim();
        if (!content) {
          ack?.({ ok: false, error: "Card content is required" });
          return;
        }
        if (!authorName) {
          ack?.({ ok: false, error: "Display name is required" });
          return;
        }
        try {
          const { card, boardId } = createCard(
            payload.columnId,
            content,
            authorName,
          );
          io.to(boardRoom(boardId)).emit("card_added", { card });
          ack?.({ ok: true, card });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          ack?.({ ok: false, error: message });
        }
      },
    );

    socket.on(
      "move_card",
      (payload: MoveCardPayload, ack?: (response: unknown) => void) => {
        if (
          !payload ||
          !isString(payload.boardId) ||
          !isString(payload.cardId) ||
          !isString(payload.targetColumnId) ||
          !isNumber(payload.targetIndex)
        ) {
          ack?.({ ok: false, error: "Invalid payload" });
          return;
        }
        try {
          const { card, boardId, sourceColumnId } = moveCard(
            payload.cardId,
            payload.targetColumnId,
            Math.floor(payload.targetIndex),
          );
          io.to(boardRoom(boardId)).emit("card_moved", {
            card,
            sourceColumnId,
            targetColumnId: payload.targetColumnId,
            targetIndex: Math.floor(payload.targetIndex),
          });
          ack?.({ ok: true, card });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          ack?.({ ok: false, error: message });
        }
      },
    );

    socket.on(
      "add_comment",
      (payload: AddCommentPayload, ack?: (response: unknown) => void) => {
        if (
          !payload ||
          !isString(payload.boardId) ||
          !isString(payload.cardId) ||
          !isString(payload.content) ||
          !isString(payload.authorName)
        ) {
          ack?.({ ok: false, error: "Invalid payload" });
          return;
        }
        const content = payload.content.trim();
        const authorName = payload.authorName.trim();
        if (!content) {
          ack?.({ ok: false, error: "Comment content is required" });
          return;
        }
        if (!authorName) {
          ack?.({ ok: false, error: "Display name is required" });
          return;
        }
        try {
          const { comment, boardId } = createComment(
            payload.cardId,
            content,
            authorName,
          );
          io.to(boardRoom(boardId)).emit("comment_added", { comment });
          ack?.({ ok: true, comment });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          ack?.({ ok: false, error: message });
        }
      },
    );
  });
}
