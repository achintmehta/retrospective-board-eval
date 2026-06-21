import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'retro.sqlite');

let db: Database;

export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL mode for better concurrency
  db.run('PRAGMA journal_mode=WAL;');

  createSchema();
  saveDb();

  return db;
}

function saveDb(): void {
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, buffer);
}

function createSchema(): void {
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
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      position INTEGER NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

// ─── Board Queries ────────────────────────────────────────────────────────────

export function getAllBoards(): Board[] {
  const stmt = db.prepare('SELECT * FROM boards ORDER BY created_at DESC');
  const rows: Board[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as Board);
  }
  stmt.free();
  return rows;
}

export function getBoardById(id: string): Board | null {
  const stmt = db.prepare('SELECT * FROM boards WHERE id = :id');
  stmt.bind({ ':id': id });
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as Board;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function createBoard(id: string, title: string): Board {
  const now = new Date().toISOString();
  db.run('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)', [id, title, now]);
  saveDb();
  return { id, title, created_at: now };
}

// ─── Column Queries ───────────────────────────────────────────────────────────

export function getColumnsByBoardId(boardId: string): BoardColumn[] {
  const stmt = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = :boardId ORDER BY position ASC'
  );
  stmt.bind({ ':boardId': boardId });
  const rows: BoardColumn[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as BoardColumn);
  }
  stmt.free();
  return rows;
}

export function createColumn(id: string, boardId: string, title: string, position: number): BoardColumn {
  db.run(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
    [id, boardId, title, position]
  );
  saveDb();
  return { id, board_id: boardId, title, position };
}

// ─── Card Queries ─────────────────────────────────────────────────────────────

export function getCardsByColumnId(columnId: string): Card[] {
  const stmt = db.prepare(
    'SELECT * FROM cards WHERE column_id = :columnId ORDER BY position ASC, created_at ASC'
  );
  stmt.bind({ ':columnId': columnId });
  const rows: Card[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as Card);
  }
  stmt.free();
  return rows;
}

export function createCard(id: string, columnId: string, content: string, authorName: string, position: number): Card {
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO cards (id, column_id, content, author_name, created_at, position) VALUES (?, ?, ?, ?, ?, ?)',
    [id, columnId, content, authorName, now, position]
  );
  saveDb();
  return { id, column_id: columnId, content, author_name: authorName, created_at: now, position };
}

export function moveCard(cardId: string, newColumnId: string, newPosition: number): void {
  db.run(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
    [newColumnId, newPosition, cardId]
  );
  saveDb();
}

// ─── Comment Queries ──────────────────────────────────────────────────────────

export function getCommentsByCardId(cardId: string): Comment[] {
  const stmt = db.prepare(
    'SELECT * FROM comments WHERE card_id = :cardId ORDER BY created_at ASC'
  );
  stmt.bind({ ':cardId': cardId });
  const rows: Comment[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as Comment);
  }
  stmt.free();
  return rows;
}

export function createComment(id: string, cardId: string, content: string, authorName: string): Comment {
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, cardId, content, authorName, now]
  );
  saveDb();
  return { id, card_id: cardId, content, author_name: authorName, created_at: now };
}

// ─── Full Board Query ─────────────────────────────────────────────────────────

export function getFullBoard(boardId: string): FullBoard | null {
  const board = getBoardById(boardId);
  if (!board) return null;

  const columns = getColumnsByBoardId(boardId);
  const fullColumns: FullColumn[] = columns.map(col => {
    const cards = getCardsByColumnId(col.id);
    const fullCards: FullCard[] = cards.map(card => ({
      ...card,
      comments: getCommentsByCardId(card.id),
    }));
    return { ...col, cards: fullCards };
  });

  return { ...board, columns: fullColumns };
}

// ─── Export Query ─────────────────────────────────────────────────────────────

export function getBoardExportData(boardId: string): ExportRow[] {
  const board = getFullBoard(boardId);
  if (!board) return [];

  const rows: ExportRow[] = [];
  for (const col of board.columns) {
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        rows.push({
          board_title: board.title,
          column_title: col.title,
          card_content: card.content,
          card_author: card.author_name,
          card_created_at: card.created_at,
          comment_content: '',
          comment_author: '',
          comment_created_at: '',
        });
      } else {
        for (const comment of card.comments) {
          rows.push({
            board_title: board.title,
            column_title: col.title,
            card_content: card.content,
            card_author: card.author_name,
            card_created_at: card.created_at,
            comment_content: comment.content,
            comment_author: comment.author_name,
            comment_created_at: comment.created_at,
          });
        }
      }
    }
  }
  return rows;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Board {
  id: string;
  title: string;
  created_at: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;
}

export interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: string;
  position: number;
}

export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface FullCard extends Card {
  comments: Comment[];
}

export interface FullColumn extends BoardColumn {
  cards: FullCard[];
}

export interface FullBoard extends Board {
  columns: FullColumn[];
}

export interface ExportRow {
  board_title: string;
  column_title: string;
  card_content: string;
  card_author: string;
  card_created_at: string;
  comment_content: string;
  comment_author: string;
  comment_created_at: string;
}
