import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'retro.sqlite');

let db;

export async function initDb() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  createTables();
  return db;
}

function createTables() {
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

  persist();
}

export function persist() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function getDb() {
  return db;
}
