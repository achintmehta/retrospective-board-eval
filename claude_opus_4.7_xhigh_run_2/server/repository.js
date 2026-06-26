import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

const stmts = {
  insertBoard: db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'),
  selectBoards: db.prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC'),
  selectBoard: db.prepare('SELECT id, title, created_at FROM boards WHERE id = ?'),

  insertColumn: db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ),
  selectColumnsForBoard: db.prepare(
    'SELECT id, board_id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
  ),
  selectColumn: db.prepare('SELECT id, board_id FROM board_columns WHERE id = ?'),
  maxColumnPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max_pos FROM board_columns WHERE board_id = ?'
  ),

  insertCard: db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  selectCardsForBoard: db.prepare(`
    SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
    FROM cards c
    JOIN board_columns bc ON bc.id = c.column_id
    WHERE bc.board_id = ?
    ORDER BY c.position ASC, c.created_at ASC
  `),
  selectCard: db.prepare(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
  ),
  maxCardPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?'
  ),
  updateCardPosition: db.prepare(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
  ),
  boardIdForCard: db.prepare(`
    SELECT bc.board_id AS board_id
    FROM cards c
    JOIN board_columns bc ON bc.id = c.column_id
    WHERE c.id = ?
  `),
  boardIdForColumn: db.prepare('SELECT board_id FROM board_columns WHERE id = ?'),

  insertComment: db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ),
  selectCommentsForBoard: db.prepare(`
    SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
    FROM comments cm
    JOIN cards c ON c.id = cm.card_id
    JOIN board_columns bc ON bc.id = c.column_id
    WHERE bc.board_id = ?
    ORDER BY cm.created_at ASC
  `),
  selectComment: db.prepare(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?'
  ),
};

const createBoardTx = db.transaction((board, columns) => {
  stmts.insertBoard.run(board.id, board.title, board.created_at);
  columns.forEach((col) => {
    stmts.insertColumn.run(col.id, col.board_id, col.title, col.position, col.created_at);
  });
});

export function createBoard(title) {
  const now = Date.now();
  const trimmed = String(title || '').trim();
  if (!trimmed) throw new Error('Board title is required');

  const board = { id: randomUUID(), title: trimmed, created_at: now };
  const columns = DEFAULT_COLUMNS.map((t, i) => ({
    id: randomUUID(),
    board_id: board.id,
    title: t,
    position: i,
    created_at: now,
  }));
  createBoardTx(board, columns);
  return getBoard(board.id);
}

export function listBoards() {
  return stmts.selectBoards.all();
}

export function getBoard(boardId) {
  const board = stmts.selectBoard.get(boardId);
  if (!board) return null;
  const columns = stmts.selectColumnsForBoard.all(boardId);
  const cards = stmts.selectCardsForBoard.all(boardId);
  const comments = stmts.selectCommentsForBoard.all(boardId);

  const cardsByColumn = new Map();
  const commentsByCard = new Map();
  comments.forEach((cm) => {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  });
  cards.forEach((c) => {
    const enriched = { ...c, comments: commentsByCard.get(c.id) || [] };
    if (!cardsByColumn.has(c.column_id)) cardsByColumn.set(c.column_id, []);
    cardsByColumn.get(c.column_id).push(enriched);
  });
  const enrichedColumns = columns.map((col) => ({
    ...col,
    cards: cardsByColumn.get(col.id) || [],
  }));

  return { ...board, columns: enrichedColumns };
}

export function createColumn(boardId, title) {
  const trimmed = String(title || '').trim();
  if (!trimmed) throw new Error('Column title is required');
  const board = stmts.selectBoard.get(boardId);
  if (!board) throw new Error('Board not found');
  const now = Date.now();
  const position = stmts.maxColumnPosition.get(boardId).max_pos + 1;
  const column = {
    id: randomUUID(),
    board_id: boardId,
    title: trimmed,
    position,
    created_at: now,
  };
  stmts.insertColumn.run(column.id, column.board_id, column.title, column.position, column.created_at);
  return column;
}

export function createCard({ columnId, content, authorName }) {
  const trimmed = String(content || '').trim();
  if (!trimmed) throw new Error('Card content is required');
  const author = String(authorName || '').trim() || 'Anonymous';
  const col = stmts.selectColumn.get(columnId);
  if (!col) throw new Error('Column not found');
  const now = Date.now();
  const position = stmts.maxCardPosition.get(columnId).max_pos + 1;
  const card = {
    id: randomUUID(),
    column_id: columnId,
    content: trimmed,
    author_name: author,
    position,
    created_at: now,
  };
  stmts.insertCard.run(card.id, card.column_id, card.content, card.author_name, card.position, card.created_at);
  return { card, boardId: col.board_id };
}

export function moveCard({ cardId, toColumnId, toPosition }) {
  const card = stmts.selectCard.get(cardId);
  if (!card) throw new Error('Card not found');
  const col = stmts.selectColumn.get(toColumnId);
  if (!col) throw new Error('Target column not found');
  const targetPos = Number.isInteger(toPosition)
    ? toPosition
    : stmts.maxCardPosition.get(toColumnId).max_pos + 1;
  stmts.updateCardPosition.run(toColumnId, targetPos, cardId);
  const updated = stmts.selectCard.get(cardId);
  return { card: updated, boardId: col.board_id };
}

export function createComment({ cardId, content, authorName }) {
  const trimmed = String(content || '').trim();
  if (!trimmed) throw new Error('Comment content is required');
  const author = String(authorName || '').trim() || 'Anonymous';
  const row = stmts.boardIdForCard.get(cardId);
  if (!row) throw new Error('Card not found');
  const now = Date.now();
  const comment = {
    id: randomUUID(),
    card_id: cardId,
    content: trimmed,
    author_name: author,
    created_at: now,
  };
  stmts.insertComment.run(comment.id, comment.card_id, comment.content, comment.author_name, comment.created_at);
  return { comment, boardId: row.board_id };
}

export function getBoardIdForColumn(columnId) {
  const row = stmts.boardIdForColumn.get(columnId);
  return row ? row.board_id : null;
}
