const db = require('./db');

// Boards
function createBoard(title) {
  const stmt = db.prepare('INSERT INTO boards (title) VALUES (?)');
  const result = stmt.run(title);
  return db.prepare('SELECT * FROM boards WHERE id = ?').get(result.lastInsertRowid);
}

function getAllBoards() {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoardById(id) {
  return db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
}

function getBoardWithDetails(boardId) {
  const board = getBoardById(boardId);
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
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM board_columns WHERE board_id = ?'
  ).get(boardId);
  const position = maxPos.maxPos + 1;

  const stmt = db.prepare('INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)');
  const result = stmt.run(boardId, title, position);
  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(result.lastInsertRowid);
}

// Cards
function createCard(columnId, content, authorName) {
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM cards WHERE column_id = ?'
  ).get(columnId);
  const position = maxPos.maxPos + 1;

  const stmt = db.prepare(
    'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(columnId, content, authorName, position);
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);
  card.comments = [];
  return card;
}

function moveCard(cardId, newColumnId, newPosition) {
  const stmt = db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?');
  stmt.run(newColumnId, newPosition, cardId);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

// Comments
function createComment(cardId, content, authorName) {
  const stmt = db.prepare(
    'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'
  );
  const result = stmt.run(cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
}

// Export
function getBoardExportData(boardId) {
  const board = getBoardById(boardId);
  if (!board) return null;

  const rows = db.prepare(`
    SELECT
      bc.title as column_title,
      c.content as card_content,
      c.author_name as card_author,
      c.created_at as card_created_at,
      cm.content as comment_content,
      cm.author_name as comment_author,
      cm.created_at as comment_created_at
    FROM board_columns bc
    LEFT JOIN cards c ON c.column_id = bc.id
    LEFT JOIN comments cm ON cm.card_id = c.id
    WHERE bc.board_id = ?
    ORDER BY bc.position, c.position, cm.created_at
  `).all(boardId);

  return { board, rows };
}

module.exports = {
  createBoard,
  getAllBoards,
  getBoardById,
  getBoardWithDetails,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardExportData,
};
