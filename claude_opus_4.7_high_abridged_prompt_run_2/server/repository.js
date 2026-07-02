import { customAlphabet } from 'nanoid';
import { db } from './db.js';

const alphabet = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const shortId = customAlphabet(alphabet, 12);
export const newId = () => shortId();

const DEFAULT_COLUMNS = [
  { title: 'What went well', color: 'success' },
  { title: 'What could be improved', color: 'warning' },
  { title: 'Action items', color: 'accent' },
];

// ---------- boards ----------

const insertBoardStmt = db.prepare(
  'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
);
const listBoardsStmt = db.prepare(
  'SELECT b.id, b.title, b.created_at, (SELECT COUNT(*) FROM cards c JOIN board_columns col ON col.id = c.column_id WHERE col.board_id = b.id) AS card_count FROM boards b ORDER BY b.created_at DESC'
);
const getBoardStmt = db.prepare(
  'SELECT id, title, created_at FROM boards WHERE id = ?'
);
const listColumnsStmt = db.prepare(
  'SELECT id, board_id, title, color, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
);
const listCardsForBoardStmt = db.prepare(
  `SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
   FROM cards c JOIN board_columns col ON col.id = c.column_id
   WHERE col.board_id = ? ORDER BY c.position ASC, c.created_at ASC`
);
const listCommentsForBoardStmt = db.prepare(
  `SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
   FROM comments cm JOIN cards c ON c.id = cm.card_id
   JOIN board_columns col ON col.id = c.column_id
   WHERE col.board_id = ? ORDER BY cm.created_at ASC`
);

const insertColumnStmt = db.prepare(
  'INSERT INTO board_columns (id, board_id, title, color, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const maxColumnPositionStmt = db.prepare(
  'SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?'
);

const createBoardWithDefaults = db.transaction((title) => {
  const now = Date.now();
  const boardId = newId();
  insertBoardStmt.run(boardId, title, now);
  DEFAULT_COLUMNS.forEach((col, index) => {
    insertColumnStmt.run(newId(), boardId, col.title, col.color, index, now);
  });
  return boardId;
});

export function createBoard(title) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Title is required');
  if (cleanTitle.length > 120) throw new Error('Title too long');
  const id = createBoardWithDefaults(cleanTitle);
  return getBoard(id);
}

export function listBoards() {
  return listBoardsStmt.all();
}

export function getBoard(id) {
  const board = getBoardStmt.get(id);
  if (!board) return null;
  const columns = listColumnsStmt.all(id);
  const cards = listCardsForBoardStmt.all(id);
  const comments = listCommentsForBoardStmt.all(id);

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

export function addColumn(boardId, title, color = 'accent') {
  const board = getBoardStmt.get(boardId);
  if (!board) throw new Error('Board not found');
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Column title required');
  if (cleanTitle.length > 60) throw new Error('Column title too long');
  const now = Date.now();
  const { max } = maxColumnPositionStmt.get(boardId);
  const id = newId();
  insertColumnStmt.run(id, boardId, cleanTitle, color, max + 1, now);
  return { id, board_id: boardId, title: cleanTitle, color, position: max + 1, created_at: now, cards: [] };
}

// ---------- cards ----------

const insertCardStmt = db.prepare(
  'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const maxCardPositionStmt = db.prepare(
  'SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?'
);
const getCardStmt = db.prepare(
  'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
);
const updateCardColumnStmt = db.prepare(
  'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
);
const bumpCardPositionsStmt = db.prepare(
  'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
);
const getColumnStmt = db.prepare(
  'SELECT id, board_id FROM board_columns WHERE id = ?'
);

export function getColumn(id) {
  return getColumnStmt.get(id);
}

export function addCard({ columnId, content, authorName }) {
  const col = getColumn(columnId);
  if (!col) throw new Error('Column not found');
  const cleanContent = String(content || '').trim();
  if (!cleanContent) throw new Error('Card content required');
  if (cleanContent.length > 2000) throw new Error('Card content too long');
  const cleanAuthor = String(authorName || 'Anonymous').trim().slice(0, 40) || 'Anonymous';
  const { max } = maxCardPositionStmt.get(columnId);
  const now = Date.now();
  const id = newId();
  insertCardStmt.run(id, columnId, cleanContent, cleanAuthor, max + 1, now);
  return {
    id,
    column_id: columnId,
    content: cleanContent,
    author_name: cleanAuthor,
    position: max + 1,
    created_at: now,
    comments: [],
    boardId: col.board_id,
  };
}

export const moveCard = db.transaction(({ cardId, toColumnId, toPosition }) => {
  const card = getCardStmt.get(cardId);
  if (!card) throw new Error('Card not found');
  const col = getColumn(toColumnId);
  if (!col) throw new Error('Column not found');

  const pos = Number.isInteger(toPosition) && toPosition >= 0 ? toPosition : 0;
  bumpCardPositionsStmt.run(toColumnId, pos);
  updateCardColumnStmt.run(toColumnId, pos, cardId);
  normalizeColumnPositions(card.column_id);
  if (card.column_id !== toColumnId) normalizeColumnPositions(toColumnId);
  return {
    cardId,
    fromColumnId: card.column_id,
    toColumnId,
    toPosition: pos,
    boardId: col.board_id,
  };
});

const listCardsInColumnStmt = db.prepare(
  'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
);
const setCardPositionStmt = db.prepare('UPDATE cards SET position = ? WHERE id = ?');

function normalizeColumnPositions(columnId) {
  const ids = listCardsInColumnStmt.all(columnId);
  ids.forEach((row, index) => setCardPositionStmt.run(index, row.id));
}

// ---------- comments ----------

const insertCommentStmt = db.prepare(
  'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
);
const getCardBoardStmt = db.prepare(
  `SELECT col.board_id AS board_id FROM cards c
   JOIN board_columns col ON col.id = c.column_id WHERE c.id = ?`
);

export function addComment({ cardId, content, authorName }) {
  const row = getCardBoardStmt.get(cardId);
  if (!row) throw new Error('Card not found');
  const cleanContent = String(content || '').trim();
  if (!cleanContent) throw new Error('Comment content required');
  if (cleanContent.length > 2000) throw new Error('Comment content too long');
  const cleanAuthor = String(authorName || 'Anonymous').trim().slice(0, 40) || 'Anonymous';
  const now = Date.now();
  const id = newId();
  insertCommentStmt.run(id, cardId, cleanContent, cleanAuthor, now);
  return {
    id,
    card_id: cardId,
    content: cleanContent,
    author_name: cleanAuthor,
    created_at: now,
    boardId: row.board_id,
  };
}

// ---------- export ----------

export function exportBoardRows(boardId) {
  const board = getBoardStmt.get(boardId);
  if (!board) return null;
  const columns = listColumnsStmt.all(boardId);
  const cards = listCardsForBoardStmt.all(boardId);
  const comments = listCommentsForBoardStmt.all(boardId);

  const columnById = new Map(columns.map((c) => [c.id, c]));
  const commentsByCard = new Map();
  for (const c of comments) {
    if (!commentsByCard.has(c.card_id)) commentsByCard.set(c.card_id, []);
    commentsByCard.get(c.card_id).push(c);
  }

  const rows = [];
  for (const card of cards) {
    const col = columnById.get(card.column_id);
    const cardComments = commentsByCard.get(card.id) || [];
    if (cardComments.length === 0) {
      rows.push({
        column: col?.title || '',
        card: card.content,
        card_author: card.author_name,
        card_created_at: new Date(card.created_at).toISOString(),
        comment: '',
        comment_author: '',
        comment_created_at: '',
      });
    } else {
      for (const cm of cardComments) {
        rows.push({
          column: col?.title || '',
          card: card.content,
          card_author: card.author_name,
          card_created_at: new Date(card.created_at).toISOString(),
          comment: cm.content,
          comment_author: cm.author_name,
          comment_created_at: new Date(cm.created_at).toISOString(),
        });
      }
    }
  }
  return { board, rows };
}
