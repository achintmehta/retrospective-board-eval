import { randomUUID } from 'node:crypto';
import { db, withTransaction } from './db.js';
import type {
  Board,
  BoardColumn,
  BoardWithChildren,
  Card,
  Comment,
} from './types.js';

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export function createBoard(title: string): Board {
  const id = randomUUID();
  const created_at = new Date().toISOString();
  withTransaction(() => {
    db.prepare(
      'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
    ).run(id, title, created_at);
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      db.prepare(
        'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
      ).run(randomUUID(), id, colTitle, idx);
    });
  });
  return { id, title, created_at };
}

export function listBoards(): Board[] {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all() as unknown as Board[];
}

export function getBoard(id: string): Board | undefined {
  return db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(id) as unknown as Board | undefined;
}

export function getBoardWithChildren(
  boardId: string
): BoardWithChildren | undefined {
  const board = getBoard(boardId);
  if (!board) return undefined;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(boardId) as unknown as BoardColumn[];

  const cards = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
       FROM cards c
       INNER JOIN board_columns bc ON bc.id = c.column_id
       WHERE bc.board_id = ?
       ORDER BY c.position ASC, c.created_at ASC`
    )
    .all(boardId) as unknown as Card[];

  const cardIds = cards.map((c) => c.id);
  let comments: Comment[] = [];
  if (cardIds.length > 0) {
    const placeholders = cardIds.map(() => '?').join(',');
    comments = db
      .prepare(
        `SELECT id, card_id, content, author_name, created_at
         FROM comments WHERE card_id IN (${placeholders})
         ORDER BY created_at ASC`
      )
      .all(...cardIds) as unknown as Comment[];
  }

  const commentsByCard = new Map<string, Comment[]>();
  comments.forEach((c) => {
    const arr = commentsByCard.get(c.card_id) ?? [];
    arr.push(c);
    commentsByCard.set(c.card_id, arr);
  });

  const cardsByColumn = new Map<
    string,
    (Card & { comments: Comment[] })[]
  >();
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
): BoardColumn | undefined {
  const board = getBoard(boardId);
  if (!board) return undefined;
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS maxPos FROM board_columns WHERE board_id = ?'
    )
    .get(boardId) as { maxPos: number };
  const id = randomUUID();
  const position = row.maxPos + 1;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, position);
  return { id, board_id: boardId, title, position };
}

export function getColumn(id: string): BoardColumn | undefined {
  return db
    .prepare(
      'SELECT id, board_id, title, position FROM board_columns WHERE id = ?'
    )
    .get(id) as BoardColumn | undefined;
}

export function getColumnBoardId(columnId: string): string | undefined {
  const row = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(columnId) as { board_id: string } | undefined;
  return row?.board_id;
}

export function getCardBoardId(cardId: string): string | undefined {
  const row = db
    .prepare(
      `SELECT bc.board_id AS board_id
       FROM cards c
       INNER JOIN board_columns bc ON bc.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId) as { board_id: string } | undefined;
  return row?.board_id;
}

export function addCard(
  columnId: string,
  content: string,
  authorName: string
): (Card & { comments: Comment[] }) | undefined {
  const column = getColumn(columnId);
  if (!column) return undefined;
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS maxPos FROM cards WHERE column_id = ?'
    )
    .get(columnId) as { maxPos: number };
  const id = randomUUID();
  const created_at = new Date().toISOString();
  const position = row.maxPos + 1;
  db.prepare(
    `INSERT INTO cards (id, column_id, content, author_name, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, columnId, content, authorName, position, created_at);
  return {
    id,
    column_id: columnId,
    content,
    author_name: authorName,
    position,
    created_at,
    comments: [],
  };
}

export interface MoveCardResult {
  card: Card;
  fromColumnId: string;
  toColumnId: string;
}

export function moveCard(
  cardId: string,
  toColumnId: string,
  toPosition: number
): MoveCardResult | undefined {
  const existing = db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId) as Card | undefined;
  if (!existing) return undefined;
  const target = getColumn(toColumnId);
  if (!target) return undefined;

  const fromColumnId = existing.column_id;

  withTransaction(() => {
    if (fromColumnId === toColumnId) {
      // Reorder within the same column
      const cards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        )
        .all(toColumnId) as { id: string }[];
      const ids = cards.map((c) => c.id).filter((cid) => cid !== cardId);
      const clamped = Math.max(0, Math.min(toPosition, ids.length));
      ids.splice(clamped, 0, cardId);
      ids.forEach((cid, idx) => {
        db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(idx, cid);
      });
    } else {
      // Remove from source column and re-pack
      const sourceCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC, created_at ASC'
        )
        .all(fromColumnId, cardId) as { id: string }[];
      sourceCards.forEach((c, idx) => {
        db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(idx, c.id);
      });

      // Insert into target column at desired position
      const targetCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        )
        .all(toColumnId) as { id: string }[];
      const ids = targetCards.map((c) => c.id);
      const clamped = Math.max(0, Math.min(toPosition, ids.length));
      ids.splice(clamped, 0, cardId);
      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(
        toColumnId,
        cardId
      );
      ids.forEach((cid, idx) => {
        db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(idx, cid);
      });
    }
  });

  const updated = db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId) as unknown as Card;

  return { card: updated, fromColumnId, toColumnId };
}

export function addComment(
  cardId: string,
  content: string,
  authorName: string
): Comment | undefined {
  const cardExists = db
    .prepare('SELECT 1 AS ok FROM cards WHERE id = ?')
    .get(cardId);
  if (!cardExists) return undefined;
  const id = randomUUID();
  const created_at = new Date().toISOString();
  db.prepare(
    `INSERT INTO comments (id, card_id, content, author_name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, cardId, content, authorName, created_at);
  return { id, card_id: cardId, content, author_name: authorName, created_at };
}

export interface ExportRow {
  column_title: string;
  card_content: string;
  card_author: string;
  card_created_at: string;
  comment_content: string;
  comment_author: string;
  comment_created_at: string;
}

export function exportBoardRows(boardId: string): ExportRow[] {
  return db
    .prepare(
      `SELECT bc.title AS column_title,
              c.content AS card_content,
              c.author_name AS card_author,
              c.created_at AS card_created_at,
              COALESCE(cm.content, '') AS comment_content,
              COALESCE(cm.author_name, '') AS comment_author,
              COALESCE(cm.created_at, '') AS comment_created_at
       FROM board_columns bc
       LEFT JOIN cards c ON c.column_id = bc.id
       LEFT JOIN comments cm ON cm.card_id = c.id
       WHERE bc.board_id = ?
       ORDER BY bc.position ASC, c.position ASC, cm.created_at ASC`
    )
    .all(boardId) as unknown as ExportRow[];
}
