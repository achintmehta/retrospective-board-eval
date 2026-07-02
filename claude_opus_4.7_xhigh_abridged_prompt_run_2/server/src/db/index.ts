import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_SQL } from './schema.js';

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'retro.sqlite');
export const db = new Database(dbPath);

// WAL keeps writers from blocking readers — safe for our 10-30 user target.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(SCHEMA_SQL);

export default db;
