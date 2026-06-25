const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.RETRO_DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = process.env.RETRO_DB_PATH || path.join(DATA_DIR, 'retro.sqlite');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id         TEXT PRIMARY KEY,
      board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      position   REAL NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cards (
      id          TEXT PRIMARY KEY,
      column_id   TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      author_name TEXT NOT NULL,
      position    REAL NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id          TEXT PRIMARY KEY,
      card_id     TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_columns_board     ON board_columns(board_id, position);
    CREATE INDEX IF NOT EXISTS idx_cards_column      ON cards(column_id, position);
    CREATE INDEX IF NOT EXISTS idx_comments_card     ON comments(card_id, created_at);
  `);
}

initSchema();

module.exports = { db, DB_PATH };
