// @ts-nocheck

const db = require('./database');
const { Board, BoardColumn, Card, Comment } = require('../types');

// ==================== BOARD UTILITIES ====================

function getBoards() {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoardById(id) {
  return (
    db
      .prepare('SELECT * FROM boards WHERE id = ?')
      .get(id)
  );
}

function createBoard(title) {
  const stmt = db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)');
  const result = stmt.run(`board_${Date.now()}`, title);
  return (
    db
      .prepare('SELECT * FROM boards WHERE id = ?')
      .get(result.lastInsertRowid.toString())
  );
}

// ==================== COLUMN UTILITIES ====================

function getColumnsByBoardId(boardId) {
  return db
    .prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position')
    .all(boardId);
}

function getColumnById(id) {
  return (
    db
      .prepare('SELECT * FROM board_columns WHERE id = ?')
      .get(id)
  );
}

function createColumn(boardId, title, position) {
  const stmt = db.prepare(`
    INSERT INTO board_columns (id, board_id, title, position)
    VALUES (?, ?, ?, ?)
  `);

  const maxPos = (
    db
      .prepare('SELECT MAX(position) as maxPos FROM board_columns WHERE board_id = ?')
      .get(boardId)
  ).maxPos;

  const newPos = position !== undefined ? position : (maxPos ?? -1) + 1;

  const result = stmt.run(
    `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    boardId,
    title,
    newPos,
  );

  return (
    db
      .prepare('SELECT * FROM board_columns WHERE id = ?')
      .get(result.lastInsertRowid.toString())
  );
}

// ==================== CARD UTILITIES ====================

function getCardsByColumnId(columnId) {
  return db
    .prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position')
    .all(columnId);
}

function getCardById(id) {
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
}

function createCard(columnId, content, authorName = 'Anonymous') {
  const stmt = db.prepare(`
    INSERT INTO cards (id, column_id, content, author_name, position)
    VALUES (?, ?, ?, ?, ?)
  `);

  const maxPos = (
    db
      .prepare('SELECT MAX(position) as maxPos FROM cards WHERE column_id = ?')
      .get(columnId)
  ).maxPos;

  const newPos = (maxPos ?? -1) + 1;

  const result = stmt.run(
    `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    columnId,
    content,
    authorName,
    newPos,
  );

  return (
    db
      .prepare('SELECT * FROM cards WHERE id = ?')
      .get(result.lastInsertRowid.toString())
  );
}

function moveCard(cardId, toColumnId) {
  db.prepare(`UPDATE cards SET column_id = ? WHERE id = ?`).run(toColumnId, cardId);
}

// ==================== COMMENT UTILITIES ====================

function getCommentsByCardId(cardId) {
  return db
    .prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at')
    .all(cardId);
}

function createComment(cardId, content, authorName = 'Anonymous') {
  const stmt = db.prepare(`
    INSERT INTO comments (id, card_id, content, author_name)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(
    `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    cardId,
    content,
    authorName,
  );

  return (
    db
      .prepare('SELECT * FROM comments WHERE id = ?')
      .get(result.lastInsertRowid.toString())
  );
}

module.exports = {
  getBoards,
  createBoard,
  getBoardById,
  getColumnsByBoardId,
  getColumnById,
  createColumn,
  getCardsByColumnId,
  getCardById,
  createCard,
  moveCard,
  getCommentsByCardId,
  createComment,
};
