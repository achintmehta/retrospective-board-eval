const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'retro.sqlite');

let db;

async function getDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS board_columns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      column_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
  `);

  persist();
  return db;
}

function persist() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// --- Board queries ---

function createBoard(title) {
  db.run('INSERT INTO boards (title) VALUES (?)', [title]);
  const row = db.exec('SELECT last_insert_rowid() as id')[0].values[0];
  return getBoardById(row[0]);
}

function getAllBoards() {
  const result = db.exec('SELECT id, title, created_at FROM boards ORDER BY created_at DESC');
  if (!result.length) return [];
  return result[0].values.map(r => ({ id: r[0], title: r[1], created_at: r[2] }));
}

function getBoardById(id) {
  const result = db.exec('SELECT id, title, created_at FROM boards WHERE id = ?', [id]);
  if (!result.length) return null;
  const r = result[0].values[0];
  return { id: r[0], title: r[1], created_at: r[2] };
}

function getBoardWithDetails(id) {
  const board = getBoardById(id);
  if (!board) return null;

  const colResult = db.exec(
    'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position',
    [id]
  );
  const columns = colResult.length
    ? colResult[0].values.map(r => ({ id: r[0], board_id: r[1], title: r[2], position: r[3], cards: [] }))
    : [];

  for (const col of columns) {
    const cardResult = db.exec(
      'SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE column_id = ? ORDER BY position',
      [col.id]
    );
    if (cardResult.length) {
      col.cards = cardResult[0].values.map(r => ({
        id: r[0], column_id: r[1], content: r[2], author_name: r[3], created_at: r[4], position: r[5], comments: []
      }));
    }

    for (const card of col.cards) {
      const commentResult = db.exec(
        'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at',
        [card.id]
      );
      if (commentResult.length) {
        card.comments = commentResult[0].values.map(r => ({
          id: r[0], card_id: r[1], content: r[2], author_name: r[3], created_at: r[4]
        }));
      }
    }
  }

  return { ...board, columns };
}

// --- Column queries ---

function createColumn(boardId, title, position) {
  db.run('INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)', [boardId, title, position]);
  const row = db.exec('SELECT last_insert_rowid() as id')[0].values[0];
  persist();
  const result = db.exec('SELECT id, board_id, title, position FROM board_columns WHERE id = ?', [row[0]]);
  const r = result[0].values[0];
  return { id: r[0], board_id: r[1], title: r[2], position: r[3] };
}

// --- Card queries ---

function createCard(columnId, content, authorName) {
  const posResult = db.exec('SELECT COALESCE(MAX(position), -1) + 1 FROM cards WHERE column_id = ?', [columnId]);
  const position = posResult[0].values[0][0];
  db.run('INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)', [columnId, content, authorName, position]);
  const row = db.exec('SELECT last_insert_rowid() as id')[0].values[0];
  persist();
  const result = db.exec('SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE id = ?', [row[0]]);
  const r = result[0].values[0];
  return { id: r[0], column_id: r[1], content: r[2], author_name: r[3], created_at: r[4], position: r[5], comments: [] };
}

function moveCard(cardId, newColumnId) {
  const posResult = db.exec('SELECT COALESCE(MAX(position), -1) + 1 FROM cards WHERE column_id = ?', [newColumnId]);
  const position = posResult[0].values[0][0];
  db.run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [newColumnId, position, cardId]);
  persist();
  const result = db.exec('SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE id = ?', [cardId]);
  const r = result[0].values[0];
  return { id: r[0], column_id: r[1], content: r[2], author_name: r[3], created_at: r[4], position: r[5] };
}

// --- Comment queries ---

function createComment(cardId, content, authorName) {
  db.run('INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)', [cardId, content, authorName]);
  const row = db.exec('SELECT last_insert_rowid() as id')[0].values[0];
  persist();
  const result = db.exec('SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?', [row[0]]);
  const r = result[0].values[0];
  return { id: r[0], card_id: r[1], content: r[2], author_name: r[3], created_at: r[4] };
}

// --- Export ---

function getBoardExportData(boardId) {
  const board = getBoardWithDetails(boardId);
  if (!board) return null;

  const rows = [];
  for (const col of board.columns) {
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        rows.push({ column: col.title, card: card.content, cardAuthor: card.author_name, comment: '', commentAuthor: '' });
      } else {
        for (const comment of card.comments) {
          rows.push({ column: col.title, card: card.content, cardAuthor: card.author_name, comment: comment.content, commentAuthor: comment.author_name });
        }
      }
    }
  }
  return { board, rows };
}

module.exports = {
  getDb,
  persist,
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
