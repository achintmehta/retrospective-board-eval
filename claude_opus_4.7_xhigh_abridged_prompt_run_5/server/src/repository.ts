import { nanoid } from 'nanoid';
import {
  db,
  transaction,
  type BoardRow,
  type CardRow,
  type ColumnRow,
  type CommentRow,
} from './db.js';

const now = () => Date.now();
const id = () => nanoid(12);

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

// ---------- Prepared statements ----------

const insertBoard = db.prepare(
  'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)',
);
const selectAllBoards = db.prepare(
  'SELECT * FROM boards ORDER BY created_at DESC',
);
const selectBoard = db.prepare('SELECT * FROM boards WHERE id = ?');

const insertColumn = db.prepare(
  'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
);
const selectColumnsByBoard = db.prepare(
  'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC',
);
const selectColumn = db.prepare('SELECT * FROM board_columns WHERE id = ?');
const selectMaxColumnPos = db.prepare(
  'SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?',
);

const insertCard = db.prepare(
  'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
);
const selectCardsByColumn = db.prepare(
  'SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC',
);
const selectCardsByBoard = db.prepare(
  `SELECT c.* FROM cards c
   INNER JOIN board_columns bc ON bc.id = c.column_id
   WHERE bc.board_id = ?
   ORDER BY bc.position ASC, c.position ASC`,
);
const selectCard = db.prepare('SELECT * FROM cards WHERE id = ?');
const selectMaxCardPos = db.prepare(
  'SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?',
);
const updateCardColumnAndPos = db.prepare(
  'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
);
const shiftCardsInColumn = db.prepare(
  'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?',
);

const insertComment = db.prepare(
  'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
);
const selectCommentsByCard = db.prepare(
  'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC',
);
const selectCommentsByBoard = db.prepare(
  `SELECT cm.* FROM comments cm
   INNER JOIN cards c ON c.id = cm.card_id
   INNER JOIN board_columns bc ON bc.id = c.column_id
   WHERE bc.board_id = ?
   ORDER BY cm.created_at ASC`,
);

// ---------- Boards ----------

export function createBoard(title: string): BoardRow {
  const boardId = id();
  const createdAt = now();
  transaction(() => {
    insertBoard.run(boardId, title, createdAt);
    DEFAULT_COLUMNS.forEach((columnTitle, index) => {
      insertColumn.run(id(), boardId, columnTitle, index, createdAt);
    });
  });
  return { id: boardId, title, created_at: createdAt };
}

export function listBoards(): BoardRow[] {
  return selectAllBoards.all() as unknown as BoardRow[];
}

export function getBoard(boardId: string): BoardRow | undefined {
  return selectBoard.get(boardId) as unknown as BoardRow | undefined;
}

// ---------- Columns ----------

export function createColumn(boardId: string, title: string): ColumnRow | null {
  if (!getBoard(boardId)) return null;
  const columnId = id();
  const createdAt = now();
  const row = selectMaxColumnPos.get(boardId) as unknown as { max: number };
  const position = row.max + 1;
  insertColumn.run(columnId, boardId, title, position, createdAt);
  return { id: columnId, board_id: boardId, title, position, created_at: createdAt };
}

export function listColumns(boardId: string): ColumnRow[] {
  return selectColumnsByBoard.all(boardId) as unknown as ColumnRow[];
}

export function getColumn(columnId: string): ColumnRow | undefined {
  return selectColumn.get(columnId) as unknown as ColumnRow | undefined;
}

// ---------- Cards ----------

export function createCard(
  columnId: string,
  content: string,
  authorName: string,
): CardRow | null {
  if (!getColumn(columnId)) return null;
  const cardId = id();
  const createdAt = now();
  const row = selectMaxCardPos.get(columnId) as unknown as { max: number };
  const position = row.max + 1;
  insertCard.run(cardId, columnId, content, authorName, position, createdAt);
  return {
    id: cardId,
    column_id: columnId,
    content,
    author_name: authorName,
    position,
    created_at: createdAt,
  };
}

export function listCardsForColumn(columnId: string): CardRow[] {
  return selectCardsByColumn.all(columnId) as unknown as CardRow[];
}

export function listCardsForBoard(boardId: string): CardRow[] {
  return selectCardsByBoard.all(boardId) as unknown as CardRow[];
}

export function getCard(cardId: string): CardRow | undefined {
  return selectCard.get(cardId) as unknown as CardRow | undefined;
}

/**
 * Move a card to a target column at the given position. If position is null,
 * the card is appended to the end.
 */
export function moveCard(
  cardId: string,
  targetColumnId: string,
  targetPosition: number | null,
): CardRow | null {
  const card = getCard(cardId);
  if (!card) return null;
  if (!getColumn(targetColumnId)) return null;

  transaction(() => {
    const row = selectMaxCardPos.get(targetColumnId) as unknown as { max: number };
    const max = row.max;
    let finalPos: number;
    if (targetPosition == null || targetPosition > max + 1) {
      finalPos = max + 1;
    } else {
      finalPos = Math.max(0, targetPosition);
      shiftCardsInColumn.run(targetColumnId, finalPos);
    }
    updateCardColumnAndPos.run(targetColumnId, finalPos, cardId);
  });
  return getCard(cardId) ?? null;
}

// ---------- Comments ----------

export function createComment(
  cardId: string,
  content: string,
  authorName: string,
): CommentRow | null {
  if (!getCard(cardId)) return null;
  const commentId = id();
  const createdAt = now();
  insertComment.run(commentId, cardId, content, authorName, createdAt);
  return {
    id: commentId,
    card_id: cardId,
    content,
    author_name: authorName,
    created_at: createdAt,
  };
}

export function listCommentsForCard(cardId: string): CommentRow[] {
  return selectCommentsByCard.all(cardId) as unknown as CommentRow[];
}

export function listCommentsForBoard(boardId: string): CommentRow[] {
  return selectCommentsByBoard.all(boardId) as unknown as CommentRow[];
}

// ---------- Aggregate ----------

export type BoardDetail = BoardRow & {
  columns: (ColumnRow & {
    cards: (CardRow & { comments: CommentRow[] })[];
  })[];
};

export function getBoardDetail(boardId: string): BoardDetail | null {
  const board = getBoard(boardId);
  if (!board) return null;
  const columns = listColumns(boardId).map((col) => {
    const cards = listCardsForColumn(col.id).map((card) => ({
      ...card,
      comments: listCommentsForCard(card.id),
    }));
    return { ...col, cards };
  });
  return { ...board, columns };
}
