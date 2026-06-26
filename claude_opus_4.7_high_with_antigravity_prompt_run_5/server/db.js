import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'retro.sqlite');

fs.mkdirSync(DATA_DIR, { recursive: true });

/**
 * Use Node 22.5+ / 24 built-in `node:sqlite` so there's no native
 * compilation step on install. The API is intentionally similar to
 * better-sqlite3 (sync, prepared statements via `.prepare(...)`).
 */
export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

/**
 * Tiny transaction helper. `node:sqlite` doesn't ship `db.transaction(fn)`
 * (better-sqlite3 has it), so we wrap BEGIN/COMMIT/ROLLBACK manually.
 */
export function inTransaction(fn) {
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

/* ------------------------- Schema ------------------------- */
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
    color       TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id          TEXT PRIMARY KEY,
    column_id   TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position    INTEGER NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    card_id     TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
`);
