import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'data', 'retro.sqlite');

let db;

export async function initDb() {
  const SQL = await initSqlJs();
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS board_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (board_id) REFERENCES boards(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    position INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (column_id) REFERENCES board_columns(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (card_id) REFERENCES cards(id)
  )`);

  persist();
  return db;
}

function persist() {
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function createBoard(id, title) {
  db.run('INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
  persist();
}

export function getAllBoards() {
  return db.exec('SELECT id, title, created_at FROM boards ORDER BY created_at DESC');
}

export function getBoard(id) {
  const boards = db.exec('SELECT id, title, created_at FROM boards WHERE id = ?', [id]);
  if (!boards.length || !boards[0].values.length) return null;

  const [boardId, title, createdAt] = boards[0].values[0];
  const columns = db.exec(
    'SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position',
    [id]
  );

  const cols = (columns[0]?.values || []).map(([colId, colTitle, position]) => {
    const cardsResult = db.exec(
      'SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE column_id = ? ORDER BY position',
      [colId]
    );
    const cards = (cardsResult[0]?.values || []).map(([cardId, columnId, content, authorName, cardCreatedAt, cardPosition]) => {
      const commentsResult = db.exec(
        'SELECT id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at',
        [cardId]
      );
      const comments = (commentsResult[0]?.values || []).map(([cmtId, cmtContent, cmtAuthor, cmtCreatedAt]) => ({
        id: cmtId, content: cmtContent, author_name: cmtAuthor, created_at: cmtCreatedAt,
      }));
      return { id: cardId, column_id: columnId, content, author_name: authorName, created_at: cardCreatedAt, position: cardPosition, comments };
    });
    return { id: colId, title: colTitle, position, cards };
  });

  return { id: boardId, title, created_at: createdAt, columns: cols };
}

export function createColumn(id, boardId, title, position) {
  db.run('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [id, boardId, title, position]);
  persist();
}

export function getMaxColumnPosition(boardId) {
  const result = db.exec('SELECT COALESCE(MAX(position), -1) FROM board_columns WHERE board_id = ?', [boardId]);
  return result[0]?.values[0][0] ?? -1;
}

export function createCard(id, columnId, content, authorName, position) {
  db.run('INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)', [id, columnId, content, authorName, position]);
  persist();
}

export function getMaxCardPosition(columnId) {
  const result = db.exec('SELECT COALESCE(MAX(position), -1) FROM cards WHERE column_id = ?', [columnId]);
  return result[0]?.values[0][0] ?? -1;
}

export function moveCard(cardId, newColumnId, newPosition) {
  db.run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [newColumnId, newPosition, cardId]);
  persist();
}

export function createComment(id, cardId, content, authorName) {
  db.run('INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)', [id, cardId, content, authorName]);
  persist();
}

export function getBoardForExport(boardId) {
  const board = getBoard(boardId);
  if (!board) return null;
  return board;
}
