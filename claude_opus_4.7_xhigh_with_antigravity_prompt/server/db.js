import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(__dirname, '..', 'data');

mkdirSync(DATA_DIR, { recursive: true });

const dbPath = join(DATA_DIR, 'retro.sqlite');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS board_columns (
  id          TEXT PRIMARY KEY,
  board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  position    INTEGER NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_board_columns_board ON board_columns(board_id, position);

CREATE TABLE IF NOT EXISTS cards (
  id           TEXT PRIMARY KEY,
  column_id    TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  position     INTEGER NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id, position);

CREATE TABLE IF NOT EXISTS comments (
  id           TEXT PRIMARY KEY,
  card_id      TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  author_name  TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id, created_at);
`);

/**
 * Lightweight transaction helper (node:sqlite has no `transaction` method).
 * Returns whatever `fn()` returns; rolls back on throw.
 */
export function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  }
}

export function dbPathForLogs() {
  return dbPath;
}
