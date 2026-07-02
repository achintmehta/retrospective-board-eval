import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR =
  process.env.DATA_DIR || path.resolve(__dirname, '..', 'data');
const DB_FILE = process.env.DB_FILE || path.join(DATA_DIR, 'retro.sqlite');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_columns (
    id        TEXT PRIMARY KEY,
    board_id  TEXT NOT NULL,
    title     TEXT NOT NULL,
    position  INTEGER NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id          TEXT PRIMARY KEY,
    column_id   TEXT NOT NULL,
    content     TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position    INTEGER NOT NULL,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);

  CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    card_id     TEXT NOT NULL,
    content     TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
`);

export default db;
export { DB_FILE, DATA_DIR };
