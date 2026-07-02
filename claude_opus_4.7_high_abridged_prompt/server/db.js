import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'retro.sqlite');

const db = new sqlite3.Database(DB_PATH);

// Promise wrappers
export const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

export const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

export const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

export const exec = (sql) =>
  new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });

export async function initSchema() {
  await exec('PRAGMA journal_mode = WAL;');
  await exec('PRAGMA foreign_keys = ON;');
  await exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS board_columns (
      id         TEXT PRIMARY KEY,
      board_id   TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title      TEXT NOT NULL,
      position   INTEGER NOT NULL,
      created_at INTEGER NOT NULL
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
}

export { DB_PATH };
export default db;
