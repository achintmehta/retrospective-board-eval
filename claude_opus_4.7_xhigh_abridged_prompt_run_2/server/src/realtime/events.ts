/**
 * Wire protocol constants shared between the socket layer and its consumers.
 * Keeping these as literals rather than strings-in-source lets us rename in
 * one place if the wire protocol ever changes.
 */
export const EVT = {
  // Client -> Server
  JOIN_BOARD: 'join_board',
  LEAVE_BOARD: 'leave_board',
  ADD_CARD: 'add_card',
  MOVE_CARD: 'move_card',
  ADD_COMMENT: 'add_comment',

  // Server -> Client (broadcasts)
  CARD_ADDED: 'card_added',
  CARD_MOVED: 'card_moved',
  COMMENT_ADDED: 'comment_added',
  COLUMN_ADDED: 'column_added',
  PRESENCE: 'presence',
} as const;

export function boardRoom(boardId: string): string {
  return `board:${boardId}`;
}
