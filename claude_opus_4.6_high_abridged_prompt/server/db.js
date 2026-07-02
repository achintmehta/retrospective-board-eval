import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'retro.db');

let db;

export async function initDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  let buffer = null;
  if (fs.existsSync(DB_PATH)) {
    buffer = fs.readFileSync(DB_PATH);
  }

  db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
  `);

  return db;
}

export function persist() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}
