import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new sqlite3.Database(path.join(__dirname, 'retro.db'));

db.run('PRAGMA journal_mode = WAL');

export function initDb() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS boards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS board_columns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          board_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          position INTEGER NOT NULL,
          FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          column_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          author_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          position INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (column_id) REFERENCES board_columns(id) ON DELETE CASCADE
        )
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          card_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          author_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
        )
      `);
    });
    resolve();
  });
}

// Board queries
export function boardAll() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM boards ORDER BY created_at DESC', (err, rows) =>
      err ? reject(err) : resolve(rows)
    );
  });
}

export function boardCreate(title) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO boards (title) VALUES (?)');
    stmt.run(title, function (err) {
      stmt.finalize();
      if (err) reject(err);
      else resolve({ id: this.lastID, title, created_at: new Date().toISOString() });
    });
  });
}

export function boardById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM boards WHERE id = ?', [id], (err, row) =>
      err ? reject(err) : resolve(row)
    );
  });
}

// Column queries
export function columnsByBoard(boardId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position',
      [boardId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

export function columnCreate(boardId, title, position) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)');
    stmt.run([boardId, title, position], function (err) {
      stmt.finalize();
      if (err) reject(err);
      else resolve({ id: this.lastID, board_id: boardId, title, position });
    });
  });
}

// Card queries
export function cardsByColumn(columnId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position',
      [columnId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

export function cardCreate(columnId, content, authorName, position) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)');
    stmt.run([columnId, content, authorName, position], function (err) {
      stmt.finalize();
      if (err) reject(err);
      else resolve({ id: this.lastID, column_id: columnId, content, author_name: authorName, created_at: new Date().toISOString(), position });
    });
  });
}

export function cardUpdatePosition(id, position, columnId) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE cards SET position = ?, column_id = ? WHERE id = ?', [position, columnId, id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function cardById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM cards WHERE id = ?', [id], (err, row) =>
      err ? reject(err) : resolve(row)
    );
  });
}

// Comment queries
export function commentsByCard(cardId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at',
      [cardId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

export function commentCreate(cardId, content, authorName) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)');
    stmt.run([cardId, content, authorName], function (err) {
      stmt.finalize();
      if (err) reject(err);
      else resolve({ id: this.lastID, card_id: cardId, content, author_name: authorName, created_at: new Date().toISOString() });
    });
  });
}

// Export: get full board data
export function boardExportData(boardId) {
  return new Promise(async (resolve, reject) => {
    try {
      const board = await boardById(boardId);
      if (!board) return resolve(null);
      const columns = await columnsByBoard(boardId);
      const result = [];
      for (const col of columns) {
        const cards = await cardsByColumn(col.id);
        for (const card of cards) {
          const comments = await commentsByCard(card.id);
          for (const c of comments) {
            result.push({
              board: board.title,
              column: col.title,
              card: card.content,
              card_author: card.author_name,
              comment: c.content,
              comment_author: c.author_name,
              created_at: c.created_at
            });
          }
          if (comments.length === 0) {
            result.push({
              board: board.title,
              column: col.title,
              card: card.content,
              card_author: card.author_name,
              comment: '',
              comment_author: '',
              created_at: card.created_at
            });
          }
        }
      }
      resolve({ board, data: result });
    } catch (e) {
      reject(e);
    }
  });
}

export { db };
