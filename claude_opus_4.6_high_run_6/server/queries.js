const db = require('./db');

// Boards
function createBoard(title) {
  const stmt = db.prepare('INSERT INTO boards (title) VALUES (?)');
  const result = stmt.run(title);
  return getBoard(result.lastInsertRowid);
}

function getAllBoards() {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoard(id) {
  return db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
}

function getBoardWithDetails(id) {
  const board = getBoard(id);
  if (!board) return null;

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
  ).all(id);

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
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = ?'
  ).get(boardId);
  const position = maxPos.max_pos + 1;

  const stmt = db.prepare(
    'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)'
  );
  const result = stmt.run(boardId, title, position);
  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(result.lastInsertRowid);
}

// Cards
function createCard(columnId, content, authorName) {
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?'
  ).get(columnId);
  const position = maxPos.max_pos + 1;

  const stmt = db.prepare(
    'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(columnId, content, authorName, position);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);
}

function moveCard(cardId, newColumnId, newPosition) {
  const stmt = db.prepare(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
  );
  stmt.run(newColumnId, newPosition, cardId);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

function getCard(id) {
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
}

// Comments
function createComment(cardId, content, authorName) {
  const stmt = db.prepare(
    'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'
  );
  const result = stmt.run(cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
}

module.exports = {
  createBoard,
  getAllBoards,
  getBoard,
  getBoardWithDetails,
  createColumn,
  createCard,
  moveCard,
  getCard,
  createComment
};
