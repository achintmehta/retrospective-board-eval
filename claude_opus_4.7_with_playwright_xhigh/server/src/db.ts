import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type {
  Board,
  BoardColumn,
  Card,
  Comment,
  FullBoard,
} from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'retro.sqlite');

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(DB_PATH);

// Promise wrappers around the callback-based sqlite3 API.
function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
}

function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function initDb(): Promise<void> {
  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS board_columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      author_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await run(
    'CREATE INDEX IF NOT EXISTS idx_columns_board ON board_columns(board_id)'
  );
  await run('CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id)');
  await run('CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id)');
}

const DEFAULT_COLUMNS = [
  'Went Well',
  'Needs Improvement',
  'Action Items',
];

export async function createBoard(title: string): Promise<Board> {
  const id = randomUUID();
  await run('INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
  for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
    await run(
      'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
      [randomUUID(), id, DEFAULT_COLUMNS[i], i]
    );
  }
  const created = await get<Board>('SELECT * FROM boards WHERE id = ?', [id]);
  return created!;
}

export async function listBoards(): Promise<Board[]> {
  return all<Board>('SELECT * FROM boards ORDER BY created_at DESC');
}

export async function getBoardSummary(id: string): Promise<Board | undefined> {
  return get<Board>('SELECT * FROM boards WHERE id = ?', [id]);
}

export async function getFullBoard(
  boardId: string
): Promise<FullBoard | null> {
  const board = await get<Board>('SELECT * FROM boards WHERE id = ?', [
    boardId,
  ]);
  if (!board) return null;

  const columns = await all<BoardColumn>(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC, rowid ASC',
    [boardId]
  );

  const result: FullBoard = { ...board, columns: [] };

  for (const col of columns) {
    const cards = await all<Card>(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC, rowid ASC',
      [col.id]
    );
    const cardsWithComments: (Card & { comments: Comment[] })[] = [];
    for (const card of cards) {
      const comments = await all<Comment>(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC, rowid ASC',
        [card.id]
      );
      cardsWithComments.push({ ...card, comments });
    }
    result.columns.push({ ...col, cards: cardsWithComments });
  }

  return result;
}

export async function createColumn(
  boardId: string,
  title: string
): Promise<BoardColumn> {
  const id = randomUUID();
  const max = await get<{ max_position: number | null }>(
    'SELECT MAX(position) as max_position FROM board_columns WHERE board_id = ?',
    [boardId]
  );
  const nextPos = (max?.max_position ?? -1) + 1;
  await run(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
    [id, boardId, title, nextPos]
  );
  const created = await get<BoardColumn>(
    'SELECT * FROM board_columns WHERE id = ?',
    [id]
  );
  return created!;
}

export async function getColumn(
  columnId: string
): Promise<BoardColumn | undefined> {
  return get<BoardColumn>('SELECT * FROM board_columns WHERE id = ?', [
    columnId,
  ]);
}

export async function addCard(input: {
  columnId: string;
  content: string;
  authorName: string;
}): Promise<Card> {
  const id = randomUUID();
  const max = await get<{ max_position: number | null }>(
    'SELECT MAX(position) as max_position FROM cards WHERE column_id = ?',
    [input.columnId]
  );
  const nextPos = (max?.max_position ?? -1) + 1;
  await run(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)',
    [id, input.columnId, input.content, input.authorName, nextPos]
  );
  const card = await get<Card>('SELECT * FROM cards WHERE id = ?', [id]);
  return card!;
}

export async function moveCard(input: {
  cardId: string;
  toColumnId: string;
  toPosition: number;
}): Promise<Card | null> {
  const card = await get<Card>('SELECT * FROM cards WHERE id = ?', [
    input.cardId,
  ]);
  if (!card) return null;

  const targetCol = await getColumn(input.toColumnId);
  if (!targetCol) return null;

  // Pull the card out of its current column first to make repositioning simple.
  await run(
    'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?',
    [card.column_id, card.position]
  );

  // Make space in the destination column at the target position.
  await run(
    'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?',
    [input.toColumnId, input.toPosition]
  );

  await run(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
    [input.toColumnId, input.toPosition, input.cardId]
  );

  const updated = await get<Card>('SELECT * FROM cards WHERE id = ?', [
    input.cardId,
  ]);
  return updated ?? null;
}

export async function getCard(cardId: string): Promise<Card | undefined> {
  return get<Card>('SELECT * FROM cards WHERE id = ?', [cardId]);
}

export async function addComment(input: {
  cardId: string;
  content: string;
  authorName: string;
}): Promise<Comment | null> {
  const card = await getCard(input.cardId);
  if (!card) return null;
  const id = randomUUID();
  await run(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)',
    [id, input.cardId, input.content, input.authorName]
  );
  const comment = await get<Comment>('SELECT * FROM comments WHERE id = ?', [
    id,
  ]);
  return comment ?? null;
}

export async function getColumnsByBoard(
  boardId: string
): Promise<BoardColumn[]> {
  return all<BoardColumn>(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC, rowid ASC',
    [boardId]
  );
}

export async function getCardsByBoard(boardId: string): Promise<Card[]> {
  return all<Card>(
    `SELECT cards.* FROM cards
     INNER JOIN board_columns ON cards.column_id = board_columns.id
     WHERE board_columns.board_id = ?
     ORDER BY board_columns.position ASC, cards.position ASC`,
    [boardId]
  );
}

export async function getCommentsByBoard(boardId: string): Promise<Comment[]> {
  return all<Comment>(
    `SELECT comments.* FROM comments
     INNER JOIN cards ON comments.card_id = cards.id
     INNER JOIN board_columns ON cards.column_id = board_columns.id
     WHERE board_columns.board_id = ?
     ORDER BY comments.created_at ASC`,
    [boardId]
  );
}
