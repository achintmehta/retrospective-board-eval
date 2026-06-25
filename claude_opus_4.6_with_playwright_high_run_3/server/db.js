const Database = require('better-sqlite3');
const path = require('path');

function initializeDatabase() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'retro.sqlite');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
  `);

  return db;
}

function createBoard(db, title) {
  const stmt = db.prepare('INSERT INTO boards (title) VALUES (?)');
  const result = stmt.run(title);
  return { id: result.lastInsertRowid, title };
}

function getAllBoards(db) {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoardById(db, boardId) {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
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

function createColumn(db, boardId, title) {
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM board_columns WHERE board_id = ?'
  ).get(boardId);
  const position = maxPos.maxPos + 1;

  const stmt = db.prepare(
    'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)'
  );
  const result = stmt.run(boardId, title, position);
  return { id: result.lastInsertRowid, board_id: boardId, title, position };
}

function createCard(db, columnId, content, authorName) {
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM cards WHERE column_id = ?'
  ).get(columnId);
  const position = maxPos.maxPos + 1;

  const stmt = db.prepare(
    'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)'
  );
  const result = stmt.run(columnId, content, authorName, position);
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);
}

function moveCard(db, cardId, targetColumnId, targetPosition) {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;

  const update = db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?');
  update.run(targetColumnId, targetPosition, cardId);

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

function createComment(db, cardId, content, authorName) {
  const stmt = db.prepare(
    'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)'
  );
  const result = stmt.run(cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
}

function getBoardForExport(db, boardId) {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
  ).all(boardId);

  const rows = [];
  for (const col of columns) {
    const cards = db.prepare(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position'
    ).all(col.id);

    for (const card of cards) {
      const comments = db.prepare(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'
      ).all(card.id);

      rows.push({
        column: col.title,
        card_content: card.content,
        card_author: card.author_name,
        card_created: card.created_at,
        comments: comments.map(c => `${c.author_name}: ${c.content}`).join(' | ')
      });
    }
  }

  return { board, rows };
}

module.exports = {
  initializeDatabase,
  createBoard,
  getAllBoards,
  getBoardById,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardForExport
};
