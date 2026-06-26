const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(DATA_DIR, 'retro.sqlite');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
  CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
`);

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

const stmts = {
  insertBoard: db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'),
  listBoards: db.prepare(`
    SELECT b.id, b.title, b.created_at,
      (SELECT COUNT(*) FROM cards c JOIN board_columns col ON col.id = c.column_id WHERE col.board_id = b.id) AS card_count
    FROM boards b ORDER BY b.created_at DESC
  `),
  getBoard: db.prepare('SELECT * FROM boards WHERE id = ?'),
  insertColumn: db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ),
  listColumns: db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC'
  ),
  getColumn: db.prepare('SELECT * FROM board_columns WHERE id = ?'),
  maxColumnPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?'
  ),
  insertCard: db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  listCardsForBoard: db.prepare(`
    SELECT c.*
    FROM cards c
    JOIN board_columns col ON col.id = c.column_id
    WHERE col.board_id = ?
    ORDER BY c.position ASC
  `),
  listCardsForColumn: db.prepare(
    'SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC'
  ),
  getCard: db.prepare('SELECT * FROM cards WHERE id = ?'),
  maxCardPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?'
  ),
  updateCardColumn: db.prepare(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
  ),
  cardsInColumn: db.prepare(
    'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC'
  ),
  setCardPosition: db.prepare('UPDATE cards SET position = ? WHERE id = ?'),
  insertComment: db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ),
  listCommentsForBoard: db.prepare(`
    SELECT cm.*
    FROM comments cm
    JOIN cards c ON c.id = cm.card_id
    JOIN board_columns col ON col.id = c.column_id
    WHERE col.board_id = ?
    ORDER BY cm.created_at ASC
  `),
  getComment: db.prepare('SELECT * FROM comments WHERE id = ?'),
};

function withTx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch {}
    throw err;
  }
}

function createBoard(title) {
  const id = randomUUID();
  const now = Date.now();
  const trimmed = String(title || '').trim();
  if (!trimmed) throw new Error('Board title is required');

  withTx(() => {
    stmts.insertBoard.run(id, trimmed, now);
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      stmts.insertColumn.run(randomUUID(), id, colTitle, idx);
    });
  });
  return getBoard(id);
}

function listBoards() {
  return stmts.listBoards.all();
}

function getBoard(id) {
  const board = stmts.getBoard.get(id);
  if (!board) return null;
  const columns = stmts.listColumns.all(id);
  const cards = stmts.listCardsForBoard.all(id);
  const comments = stmts.listCommentsForBoard.all(id);
  return { ...board, columns, cards, comments };
}

function createColumn(boardId, title) {
  const board = stmts.getBoard.get(boardId);
  if (!board) throw new Error('Board not found');
  const trimmed = String(title || '').trim();
  if (!trimmed) throw new Error('Column title is required');
  const id = randomUUID();
  const position = stmts.maxColumnPosition.get(boardId).max + 1;
  stmts.insertColumn.run(id, boardId, trimmed, position);
  return stmts.getColumn.get(id);
}

function createCard({ boardId, columnId, content, authorName }) {
  const column = stmts.getColumn.get(columnId);
  if (!column || column.board_id !== boardId) {
    throw new Error('Column not found in this board');
  }
  const trimmedContent = String(content || '').trim();
  const trimmedAuthor = String(authorName || '').trim() || 'Anonymous';
  if (!trimmedContent) throw new Error('Card content is required');

  const id = randomUUID();
  const position = stmts.maxCardPosition.get(columnId).max + 1;
  const createdAt = Date.now();
  stmts.insertCard.run(id, columnId, trimmedContent, trimmedAuthor, position, createdAt);
  return stmts.getCard.get(id);
}

function moveCard({ boardId, cardId, toColumnId, toIndex }) {
  const card = stmts.getCard.get(cardId);
  if (!card) throw new Error('Card not found');
  const toColumn = stmts.getColumn.get(toColumnId);
  if (!toColumn || toColumn.board_id !== boardId) {
    throw new Error('Target column not found in this board');
  }

  const fromColumnId = card.column_id;

  withTx(() => {
    const targetIds = stmts.cardsInColumn.all(toColumnId).map((r) => r.id).filter((rid) => rid !== cardId);
    const insertAt = Math.max(0, Math.min(Number.isInteger(toIndex) ? toIndex : targetIds.length, targetIds.length));
    targetIds.splice(insertAt, 0, cardId);

    stmts.updateCardColumn.run(toColumnId, insertAt, cardId);

    targetIds.forEach((id, idx) => stmts.setCardPosition.run(idx, id));

    if (fromColumnId !== toColumnId) {
      stmts.cardsInColumn.all(fromColumnId).forEach((row, idx) => {
        stmts.setCardPosition.run(idx, row.id);
      });
    }
  });

  const targetCards = stmts.listCardsForColumn.all(toColumnId);
  const sourceCards =
    fromColumnId !== toColumnId ? stmts.listCardsForColumn.all(fromColumnId) : targetCards;

  return {
    card: stmts.getCard.get(cardId),
    fromColumnId,
    toColumnId,
    sourceCards,
    targetCards,
  };
}

function createComment({ boardId, cardId, content, authorName }) {
  const card = stmts.getCard.get(cardId);
  if (!card) throw new Error('Card not found');
  const column = stmts.getColumn.get(card.column_id);
  if (!column || column.board_id !== boardId) {
    throw new Error('Card does not belong to this board');
  }
  const trimmedContent = String(content || '').trim();
  const trimmedAuthor = String(authorName || '').trim() || 'Anonymous';
  if (!trimmedContent) throw new Error('Comment content is required');

  const id = randomUUID();
  const createdAt = Date.now();
  stmts.insertComment.run(id, cardId, trimmedContent, trimmedAuthor, createdAt);
  return stmts.getComment.get(id);
}

function getBoardExportRows(boardId) {
  const board = getBoard(boardId);
  if (!board) return null;
  const columnsById = new Map(board.columns.map((c) => [c.id, c]));
  const commentsByCard = new Map();
  for (const cm of board.comments) {
    const arr = commentsByCard.get(cm.card_id) || [];
    arr.push(cm);
    commentsByCard.set(cm.card_id, arr);
  }

  const rows = [];
  for (const card of board.cards) {
    const column = columnsById.get(card.column_id);
    const cardComments = commentsByCard.get(card.id) || [];
    if (cardComments.length === 0) {
      rows.push({
        column: column ? column.title : '',
        card_content: card.content,
        card_author: card.author_name,
        card_created_at: new Date(card.created_at).toISOString(),
        comment_content: '',
        comment_author: '',
        comment_created_at: '',
      });
    } else {
      for (const cm of cardComments) {
        rows.push({
          column: column ? column.title : '',
          card_content: card.content,
          card_author: card.author_name,
          card_created_at: new Date(card.created_at).toISOString(),
          comment_content: cm.content,
          comment_author: cm.author_name,
          comment_created_at: new Date(cm.created_at).toISOString(),
        });
      }
    }
  }
  return { board, rows };
}

module.exports = {
  db,
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardExportRows,
};
