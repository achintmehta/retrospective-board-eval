import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'retro.sqlite');

export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS board_columns (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS board_columns_board_idx ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    column_id TEXT NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    position INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS cards_column_idx ON cards(column_id);

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS comments_card_idx ON comments(card_id);
`);

function tx<T>(fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export interface BoardRow {
  id: string;
  title: string;
  created_at: number;
}
export interface ColumnRow {
  id: string;
  board_id: string;
  title: string;
  position: number;
}
export interface CardRow {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: number;
  position: number;
}
export interface CommentRow {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: number;
}

export interface HydratedComment extends CommentRow {}
export interface HydratedCard extends CardRow {
  comments: HydratedComment[];
}
export interface HydratedColumn extends ColumnRow {
  cards: HydratedCard[];
}
export interface HydratedBoard extends BoardRow {
  columns: HydratedColumn[];
}

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export function createBoard(title: string): BoardRow {
  const id = randomUUID();
  const created_at = Date.now();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );
  tx(() => {
    insertBoard.run(id, title, created_at);
    DEFAULT_COLUMNS.forEach((colTitle, index) => {
      insertColumn.run(randomUUID(), id, colTitle, index);
    });
  });
  return { id, title, created_at };
}

export function listBoards(): BoardRow[] {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all() as unknown as BoardRow[];
}

export function getBoard(boardId: string): HydratedBoard | null {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId) as unknown as BoardRow | undefined;
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(boardId) as unknown as ColumnRow[];

  const columnIds = columns.map((c) => c.id);
  const cards: CardRow[] = columnIds.length
    ? (db
        .prepare(
          `SELECT id, column_id, content, author_name, created_at, position
           FROM cards
           WHERE column_id IN (${columnIds.map(() => '?').join(',')})
           ORDER BY position ASC`
        )
        .all(...columnIds) as unknown as CardRow[])
    : [];

  const cardIds = cards.map((c) => c.id);
  const comments: CommentRow[] = cardIds.length
    ? (db
        .prepare(
          `SELECT id, card_id, content, author_name, created_at
           FROM comments
           WHERE card_id IN (${cardIds.map(() => '?').join(',')})
           ORDER BY created_at ASC`
        )
        .all(...cardIds) as unknown as CommentRow[])
    : [];

  const commentsByCard = new Map<string, CommentRow[]>();
  comments.forEach((c) => {
    const arr = commentsByCard.get(c.card_id) ?? [];
    arr.push(c);
    commentsByCard.set(c.card_id, arr);
  });

  const cardsByColumn = new Map<string, HydratedCard[]>();
  cards.forEach((c) => {
    const arr = cardsByColumn.get(c.column_id) ?? [];
    arr.push({ ...c, comments: commentsByCard.get(c.id) ?? [] });
    cardsByColumn.set(c.column_id, arr);
  });

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) ?? [],
    })),
  };
}

export function createColumn(
  boardId: string,
  title: string
): ColumnRow | null {
  const board = db
    .prepare('SELECT id FROM boards WHERE id = ?')
    .get(boardId) as unknown as { id: string } | undefined;
  if (!board) return null;

  const nextPos = db
    .prepare(
      'SELECT COALESCE(MAX(position) + 1, 0) AS pos FROM board_columns WHERE board_id = ?'
    )
    .get(boardId) as unknown as { pos: number };

  const id = randomUUID();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, nextPos.pos);

  return { id, board_id: boardId, title, position: nextPos.pos };
}

export function addCard(
  columnId: string,
  content: string,
  authorName: string
): (CardRow & { board_id: string }) | null {
  const column = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(columnId) as unknown as { id: string; board_id: string } | undefined;
  if (!column) return null;

  const nextPos = db
    .prepare(
      'SELECT COALESCE(MAX(position) + 1, 0) AS pos FROM cards WHERE column_id = ?'
    )
    .get(columnId) as unknown as { pos: number };

  const id = randomUUID();
  const created_at = Date.now();
  db.prepare(
    `INSERT INTO cards (id, column_id, content, author_name, created_at, position)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, columnId, content, authorName, created_at, nextPos.pos);

  return {
    id,
    column_id: columnId,
    content,
    author_name: authorName,
    created_at,
    position: nextPos.pos,
    board_id: column.board_id,
  };
}

export function moveCard(
  cardId: string,
  toColumnId: string,
  toPosition: number
): { boardId: string; columnOrder: Record<string, string[]> } | null {
  const card = db
    .prepare('SELECT id, column_id FROM cards WHERE id = ?')
    .get(cardId) as unknown as { id: string; column_id: string } | undefined;
  if (!card) return null;

  const toColumn = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(toColumnId) as unknown as { id: string; board_id: string } | undefined;
  if (!toColumn) return null;

  const fromColumnId = card.column_id;

  tx(() => {
    if (fromColumnId === toColumnId) {
      const cards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC'
        )
        .all(toColumnId) as unknown as { id: string }[];
      const filtered = cards.filter((c) => c.id !== cardId).map((c) => c.id);
      const clamped = Math.max(0, Math.min(toPosition, filtered.length));
      filtered.splice(clamped, 0, cardId);
      const upd = db.prepare(
        'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
      );
      filtered.forEach((id, idx) => upd.run(toColumnId, idx, id));
    } else {
      const targetCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC'
        )
        .all(toColumnId) as unknown as { id: string }[];
      const clamped = Math.max(0, Math.min(toPosition, targetCards.length));
      const targetOrder = targetCards.map((c) => c.id);
      targetOrder.splice(clamped, 0, cardId);

      const sourceCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC'
        )
        .all(fromColumnId, cardId) as unknown as { id: string }[];
      const sourceOrder = sourceCards.map((c) => c.id);

      const upd = db.prepare(
        'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
      );
      targetOrder.forEach((id, idx) => upd.run(toColumnId, idx, id));
      sourceOrder.forEach((id, idx) => upd.run(fromColumnId, idx, id));
    }
  });

  const columns = db
    .prepare(
      'SELECT id FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(toColumn.board_id) as unknown as { id: string }[];

  const columnOrder: Record<string, string[]> = {};
  for (const col of columns) {
    const ids = db
      .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
      .all(col.id) as unknown as { id: string }[];
    columnOrder[col.id] = ids.map((c) => c.id);
  }

  return { boardId: toColumn.board_id, columnOrder };
}

export function addComment(
  cardId: string,
  content: string,
  authorName: string
): (CommentRow & { board_id: string }) | null {
  const row = db
    .prepare(
      `SELECT c.id AS card_id, bc.board_id AS board_id
       FROM cards c
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId) as unknown as { card_id: string; board_id: string } | undefined;
  if (!row) return null;

  const id = randomUUID();
  const created_at = Date.now();
  db.prepare(
    `INSERT INTO comments (id, card_id, content, author_name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, cardId, content, authorName, created_at);

  return {
    id,
    card_id: cardId,
    content,
    author_name: authorName,
    created_at,
    board_id: row.board_id,
  };
}

export function exportBoardRows(boardId: string): {
  board: BoardRow;
  rows: Array<{
    column: string;
    card: string;
    author: string;
    createdAt: string;
    comment: string;
    commentAuthor: string;
    commentCreatedAt: string;
  }>;
} | null {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId) as unknown as BoardRow | undefined;
  if (!board) return null;

  const rows = db
    .prepare(
      `SELECT
         bc.title AS column_title,
         bc.position AS column_position,
         c.content AS card_content,
         c.author_name AS card_author,
         c.created_at AS card_created,
         c.position AS card_position,
         cm.content AS comment_content,
         cm.author_name AS comment_author,
         cm.created_at AS comment_created
       FROM board_columns bc
       LEFT JOIN cards c ON c.column_id = bc.id
       LEFT JOIN comments cm ON cm.card_id = c.id
       WHERE bc.board_id = ?
       ORDER BY bc.position ASC, c.position ASC, cm.created_at ASC`
    )
    .all(boardId) as unknown as Array<{
      column_title: string;
      column_position: number;
      card_content: string | null;
      card_author: string | null;
      card_created: number | null;
      card_position: number | null;
      comment_content: string | null;
      comment_author: string | null;
      comment_created: number | null;
    }>;

  return {
    board,
    rows: rows.map((r) => ({
      column: r.column_title,
      card: r.card_content ?? '',
      author: r.card_author ?? '',
      createdAt: r.card_created ? new Date(r.card_created).toISOString() : '',
      comment: r.comment_content ?? '',
      commentAuthor: r.comment_author ?? '',
      commentCreatedAt: r.comment_created
        ? new Date(r.comment_created).toISOString()
        : '',
    })),
  };
}
