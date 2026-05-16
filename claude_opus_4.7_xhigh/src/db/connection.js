import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDbFile = path.resolve(__dirname, '..', '..', 'data', 'retro.sqlite');
const dbFile = process.env.DATABASE_FILE || defaultDbFile;

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbFile);

// WAL mode improves concurrent read performance — fine for SQLite under
// the team-scale write load this app expects.
db.serialize(() => {
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
});

export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export { db, dbFile };
