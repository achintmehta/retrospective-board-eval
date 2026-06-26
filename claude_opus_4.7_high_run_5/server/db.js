const path = require('path');
const fs = require('fs');
const { Database } = require('node-sqlite3-wasm');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'retro.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// node-sqlite3-wasm uses a `<dbfile>.lock` directory as its lock sentinel.
// If a previous process was killed forcefully (SIGKILL, taskkill /F),
// the lock dir can survive and the next startup hits SQLITE_BUSY on the
// first write. Clear any stale lock before opening.
const LOCK_DIR = `${DB_FILE}.lock`;
try {
  fs.rmdirSync(LOCK_DIR);
} catch (err) {
  if (err && err.code !== 'ENOENT' && err.code !== 'ENOTEMPTY') throw err;
}

const rawDb = new Database(DB_FILE);
rawDb.exec('PRAGMA foreign_keys = ON');

// Release the lock dir cleanly on graceful shutdown so nodemon restarts and
// `Ctrl+C` followed by `npm run dev` again don't trip SQLITE_BUSY.
function cleanup() {
  try {
    rawDb.close();
  } catch {}
  try {
    fs.rmdirSync(LOCK_DIR);
  } catch {}
}
process.once('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.once('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
process.once('SIGUSR2', () => {
  // nodemon restart signal
  cleanup();
  process.kill(process.pid, 'SIGUSR2');
});

// Thin adapter: let callers pass spread positional args instead of arrays.
function wrapStatement(stmt) {
  return {
    run: (...args) => stmt.run(args.length ? args : undefined),
    get: (...args) => stmt.get(args.length ? args : undefined),
    all: (...args) => stmt.all(args.length ? args : undefined),
  };
}

const db = {
  prepare: (sql) => wrapStatement(rawDb.prepare(sql)),
  exec: (sql) => rawDb.exec(sql),
};

function initSchema() {
  rawDb.exec(`
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
    CREATE INDEX IF NOT EXISTS idx_board_columns_board ON board_columns(board_id);

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
  `);
}

initSchema();

function transaction(fn) {
  rawDb.exec('BEGIN');
  try {
    const result = fn();
    rawDb.exec('COMMIT');
    return result;
  } catch (err) {
    rawDb.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, DB_FILE, transaction };
