import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'retro.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

/**
 * Run `fn` inside a SQLite transaction. Commits on success, rolls back on
 * throw. Mirrors the ergonomics of better-sqlite3's `.transaction()`.
 */
export function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id         TEXT PRIMARY KEY,
      board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      position   INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id, position);

    CREATE TABLE IF NOT EXISTS cards (
      id           TEXT PRIMARY KEY,
      column_id    TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
      content      TEXT NOT NULL,
      author_name  TEXT NOT NULL,
      position     INTEGER NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id, position);

    CREATE TABLE IF NOT EXISTS comments (
      id           TEXT PRIMARY KEY,
      card_id      TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      content      TEXT NOT NULL,
      author_name  TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id, created_at);
  `);
}
