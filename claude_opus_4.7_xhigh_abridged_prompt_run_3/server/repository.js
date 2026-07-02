import { nanoid } from 'nanoid';
import db from './db.js';

const DEFAULT_COLUMNS = ['What went well', 'What needs improvement', 'Action items'];

const stmts = {
  insertBoard: db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  ),
  listBoards: db.prepare(
    'SELECT id, title, created_at FROM boards ORDER BY created_at DESC'
  ),
  getBoard: db.prepare(
    'SELECT id, title, created_at FROM boards WHERE id = ?'
  ),
  insertColumn: db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ),
  listColumnsForBoard: db.prepare(
    'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC, rowid ASC'
  ),
  maxColumnPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max_pos FROM board_columns WHERE board_id = ?'
  ),
  insertCard: db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  updateCardColumn: db.prepare(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
  ),
  updateCardPosition: db.prepare(
    'UPDATE cards SET position = ? WHERE id = ?'
  ),
  listCardsForColumn: db.prepare(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE column_id = ? ORDER BY position ASC, rowid ASC'
  ),
  listCardsForBoard: db.prepare(`
    SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at, bc.board_id
    FROM cards c
    JOIN board_columns bc ON bc.id = c.column_id
    WHERE bc.board_id = ?
    ORDER BY c.position ASC, c.rowid ASC
  `),
  getCard: db.prepare(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
  ),
  maxCardPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?'
  ),
  insertComment: db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ),
  listCommentsForCard: db.prepare(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC, rowid ASC'
  ),
  listCommentsForBoard: db.prepare(`
    SELECT co.id, co.card_id, co.content, co.author_name, co.created_at
    FROM comments co
    JOIN cards c ON c.id = co.card_id
    JOIN board_columns bc ON bc.id = c.column_id
    WHERE bc.board_id = ?
    ORDER BY co.created_at ASC, co.rowid ASC
  `),
};

export function createBoard({ title, columns }) {
  const boardId = nanoid(12);
  const createdAt = Date.now();
  const columnTitles =
    Array.isArray(columns) && columns.length > 0
      ? columns.map((c) => String(c).trim()).filter(Boolean)
      : DEFAULT_COLUMNS;

  const trx = db.transaction(() => {
    stmts.insertBoard.run(boardId, title, createdAt);
    columnTitles.forEach((colTitle, i) => {
      stmts.insertColumn.run(nanoid(12), boardId, colTitle, i);
    });
  });
  trx();

  return getBoard(boardId);
}

export function listBoards() {
  return stmts.listBoards.all();
}

export function getBoardMeta(boardId) {
  return stmts.getBoard.get(boardId) || null;
}

export function getBoard(boardId) {
  const board = getBoardMeta(boardId);
  if (!board) return null;
  const columns = stmts.listColumnsForBoard.all(boardId);
  const cards = stmts.listCardsForBoard.all(boardId);
  const comments = stmts.listCommentsForBoard.all(boardId);

  const commentsByCard = new Map();
  for (const c of comments) {
    if (!commentsByCard.has(c.card_id)) commentsByCard.set(c.card_id, []);
    commentsByCard.get(c.card_id).push(c);
  }

  const cardsByColumn = new Map();
  for (const c of cards) {
    if (!cardsByColumn.has(c.column_id)) cardsByColumn.set(c.column_id, []);
    cardsByColumn.get(c.column_id).push({
      ...c,
      comments: commentsByCard.get(c.id) || [],
    });
  }

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) || [],
    })),
  };
}

export function createColumn(boardId, title) {
  const board = getBoardMeta(boardId);
  if (!board) return null;
  const nextPos = stmts.maxColumnPosition.get(boardId).max_pos + 1;
  const column = {
    id: nanoid(12),
    board_id: boardId,
    title: String(title).trim() || 'Untitled',
    position: nextPos,
  };
  stmts.insertColumn.run(column.id, column.board_id, column.title, column.position);
  return { ...column, cards: [] };
}

export function createCard({ columnId, content, authorName }) {
  const nextPos = stmts.maxCardPosition.get(columnId).max_pos + 1;
  const card = {
    id: nanoid(12),
    column_id: columnId,
    content: String(content).trim(),
    author_name: String(authorName).trim() || 'Guest',
    position: nextPos,
    created_at: Date.now(),
  };
  stmts.insertCard.run(
    card.id,
    card.column_id,
    card.content,
    card.author_name,
    card.position,
    card.created_at
  );
  return { ...card, comments: [] };
}

/**
 * Move a card into targetColumnId at targetIndex, then reindex both source and destination columns.
 * Returns the updated (source, destination) column card lists.
 */
export function moveCard({ cardId, targetColumnId, targetIndex }) {
  const card = stmts.getCard.get(cardId);
  if (!card) return null;
  const sourceColumnId = card.column_id;

  const trx = db.transaction(() => {
    stmts.updateCardColumn.run(targetColumnId, -1, cardId);

    const destCards = stmts.listCardsForColumn.all(targetColumnId).filter((c) => c.id !== cardId);
    const clampedIndex = Math.max(0, Math.min(targetIndex, destCards.length));
    destCards.splice(clampedIndex, 0, { ...card, column_id: targetColumnId });
    destCards.forEach((c, i) => stmts.updateCardPosition.run(i, c.id));

    if (sourceColumnId !== targetColumnId) {
      const sourceCards = stmts.listCardsForColumn.all(sourceColumnId);
      sourceCards.forEach((c, i) => stmts.updateCardPosition.run(i, c.id));
    }
  });
  trx();

  return {
    cardId,
    sourceColumnId,
    targetColumnId,
    sourceCards: stmts.listCardsForColumn.all(sourceColumnId),
    targetCards: stmts.listCardsForColumn.all(targetColumnId),
  };
}

export function createComment({ cardId, content, authorName }) {
  const card = stmts.getCard.get(cardId);
  if (!card) return null;
  const comment = {
    id: nanoid(12),
    card_id: cardId,
    content: String(content).trim(),
    author_name: String(authorName).trim() || 'Guest',
    created_at: Date.now(),
  };
  stmts.insertComment.run(
    comment.id,
    comment.card_id,
    comment.content,
    comment.author_name,
    comment.created_at
  );
  return comment;
}

export function listCommentsForCard(cardId) {
  return stmts.listCommentsForCard.all(cardId);
}

export function listCardsForBoard(boardId) {
  return stmts.listCardsForBoard.all(boardId);
}

export function listCommentsForBoard(boardId) {
  return stmts.listCommentsForBoard.all(boardId);
}
