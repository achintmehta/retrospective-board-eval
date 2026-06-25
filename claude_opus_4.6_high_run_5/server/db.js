import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('data', 'retro.sqlite');

let db;

export async function initDatabase() {
  const SQL = await initSqlJs();

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
  `);

  persist();
  return db;
}

function persist() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function runAndGetId(sql, params = []) {
  db.run(sql, params);
  const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
  persist();
  return id;
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function getOne(sql, params = []) {
  const rows = get(sql, params);
  return rows[0] || null;
}

// Board operations
export function createBoard(title) {
  const id = runAndGetId('INSERT INTO boards (title) VALUES (?)', [title]);
  return getOne('SELECT * FROM boards WHERE id = ?', [id]);
}

export function getAllBoards() {
  return get('SELECT * FROM boards ORDER BY created_at DESC');
}

export function getBoardById(id) {
  const board = getOne('SELECT * FROM boards WHERE id = ?', [id]);
  if (!board) return null;

  const columns = get(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position',
    [id]
  );

  for (const col of columns) {
    col.cards = get(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position',
      [col.id]
    );
    for (const card of col.cards) {
      card.comments = get(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at',
        [card.id]
      );
    }
  }

  board.columns = columns;
  return board;
}

// Column operations
export function createColumn(boardId, title) {
  const maxPos = getOne(
    'SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = ?',
    [boardId]
  );
  const position = maxPos.max_pos + 1;
  const id = runAndGetId(
    'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)',
    [boardId, title, position]
  );
  return getOne('SELECT * FROM board_columns WHERE id = ?', [id]);
}

// Card operations
export function createCard(columnId, content, authorName) {
  const maxPos = getOne(
    'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?',
    [columnId]
  );
  const position = maxPos.max_pos + 1;
  const id = runAndGetId(
    'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)',
    [columnId, content, authorName, position]
  );
  return getOne('SELECT * FROM cards WHERE id = ?', [id]);
}

export function moveCard(cardId, targetColumnId, targetPosition) {
  run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [
    targetColumnId,
    targetPosition,
    cardId,
  ]);
  return getOne('SELECT * FROM cards WHERE id = ?', [cardId]);
}

// Comment operations
export function createComment(cardId, content, authorName) {
  const id = runAndGetId(
    'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)',
    [cardId, content, authorName]
  );
  return getOne('SELECT * FROM comments WHERE id = ?', [id]);
}

// Export operations
export function getBoardExportData(boardId) {
  return get(
    `SELECT
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
    ORDER BY bc.position, c.position, cm.created_at`,
    [boardId]
  );
}
