const crypto = require('crypto');
const db = require('./db');

function genId() {
  return crypto.randomUUID();
}

// Boards
function createBoard(title) {
  const id = genId();
  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(id, title);
  return getBoard(id);
}

function getAllBoards() {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoard(id) {
  return db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
}

function getBoardFull(boardId) {
  const board = getBoard(boardId);
  if (!board) return null;

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
  ).all(boardId);

  for (const col of columns) {
    col.cards = db.prepare(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position'
    ).all(col.id);

    for (const card of col.cards) {
      card.comments = db.prepare(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'
      ).all(card.id);
    }
  }

  board.columns = columns;
  return board;
}

// Columns
function createColumn(boardId, title) {
  const id = genId();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM board_columns WHERE board_id = ?'
  ).get(boardId).max;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, maxPos + 1);
  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
}

function getColumnsByBoard(boardId) {
  return db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
  ).all(boardId);
}

// Cards
function createCard(columnId, content, authorName) {
  const id = genId();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM cards WHERE column_id = ?'
  ).get(columnId).max;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, maxPos + 1);
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  card.comments = [];
  return card;
}

function moveCard(cardId, targetColumnId, targetPosition) {
  db.prepare(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
  ).run(targetColumnId, targetPosition, cardId);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

// Comments
function createComment(cardId, content, authorName) {
  const id = genId();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
  ).run(id, cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
}

module.exports = {
  createBoard,
  getAllBoards,
  getBoard,
  getBoardFull,
  createColumn,
  getColumnsByBoard,
  createCard,
  moveCard,
  createComment,
};
