const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DB_DIR, 'retro.db');

let _db = null;

function _save() {
  const data = _db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

// Thin wrapper so routes can use the same prepare().get/all/run API as better-sqlite3
class Statement {
  constructor(sql) {
    this._sql = sql;
  }

  _params(args) {
    // Accept either spread args or a single array arg
    return args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
  }

  run(...args) {
    _db.run(this._sql, this._params(args));
    _save();
    return this;
  }

  get(...args) {
    const stmt = _db.prepare(this._sql);
    stmt.bind(this._params(args));
    const row = stmt.step() ? stmt.getAsObject() : undefined;
    stmt.free();
    return row;
  }

  all(...args) {
    const rows = [];
    const stmt = _db.prepare(this._sql);
    stmt.bind(this._params(args));
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS board_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );
`;

async function init() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  const SQL = await initSqlJs();
  _db = fs.existsSync(DB_FILE)
    ? new SQL.Database(fs.readFileSync(DB_FILE))
    : new SQL.Database();
  _db.run('PRAGMA foreign_keys = ON');
  _db.exec(SCHEMA);
  _save();
}

const db = {
  init,
  prepare: (sql) => new Statement(sql),
  exec: (sql) => { _db.exec(sql); _save(); }
};

module.exports = db;
