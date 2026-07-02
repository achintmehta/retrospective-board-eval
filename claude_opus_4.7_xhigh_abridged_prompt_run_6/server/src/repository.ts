import { nanoid } from 'nanoid';
import { db, transaction } from './db.js';
import type {
  Board,
  BoardColumn,
  BoardWithChildren,
  Card,
  Comment,
} from './types.js';

const DEFAULT_COLUMNS: { title: string; accent: string }[] = [
  { title: 'Went Well', accent: 'emerald' },
  { title: 'Needs Improvement', accent: 'rose' },
  { title: 'Action Items', accent: 'amber' },
];

export function createBoard(title: string): Board {
  const board: Board = {
    id: nanoid(12),
    title: title.trim(),
    created_at: Date.now(),
  };

  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, accent) VALUES (?, ?, ?, ?, ?)'
  );

  transaction(() => {
    insertBoard.run(board.id, board.title, board.created_at);
    DEFAULT_COLUMNS.forEach((c, i) => {
      insertColumn.run(nanoid(12), board.id, c.title, i, c.accent);
    });
  });

  return board;
}

export function listBoards(): (Board & { card_count: number })[] {
  return db
    .prepare(
      `SELECT b.*, COALESCE(cc.card_count, 0) AS card_count
       FROM boards b
       LEFT JOIN (
         SELECT bc.board_id, COUNT(c.id) AS card_count
         FROM board_columns bc
         LEFT JOIN cards c ON c.column_id = bc.id
         GROUP BY bc.board_id
       ) cc ON cc.board_id = b.id
       ORDER BY b.created_at DESC`
    )
    .all() as unknown as (Board & { card_count: number })[];
}

export function getBoardShallow(id: string): Board | null {
  const row = db
    .prepare('SELECT * FROM boards WHERE id = ?')
    .get(id) as unknown as Board | undefined;
  return row ?? null;
}

export function getBoard(id: string): BoardWithChildren | null {
  const board = getBoardShallow(id);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(id) as unknown as BoardColumn[];

  const cards = db
    .prepare(
      `SELECT c.* FROM cards c
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE bc.board_id = ?
       ORDER BY c.position ASC`
    )
    .all(id) as unknown as Card[];

  const comments = db
    .prepare(
      `SELECT cm.* FROM comments cm
       JOIN cards c ON c.id = cm.card_id
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE bc.board_id = ?
       ORDER BY cm.created_at ASC`
    )
    .all(id) as unknown as Comment[];

  const commentsByCard = new Map<string, Comment[]>();
  for (const cm of comments) {
    const list = commentsByCard.get(cm.card_id) ?? [];
    list.push(cm);
    commentsByCard.set(cm.card_id, list);
  }

  const cardsByColumn = new Map<string, (Card & { comments: Comment[] })[]>();
  for (const card of cards) {
    const list = cardsByColumn.get(card.column_id) ?? [];
    list.push({ ...card, comments: commentsByCard.get(card.id) ?? [] });
    cardsByColumn.set(card.column_id, list);
  }

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
  title: string,
  accent = 'violet'
): BoardColumn | null {
  if (!getBoardShallow(boardId)) return null;
  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS m FROM board_columns WHERE board_id = ?'
    )
    .get(boardId) as unknown as { m: number };

  const column: BoardColumn = {
    id: nanoid(12),
    board_id: boardId,
    title: title.trim(),
    position: maxPos.m + 1,
    accent,
  };
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, accent) VALUES (?, ?, ?, ?, ?)'
  ).run(
    column.id,
    column.board_id,
    column.title,
    column.position,
    column.accent
  );
  return column;
}

export function addCard(
  columnId: string,
  content: string,
  authorName: string
): (Card & { comments: Comment[] }) | null {
  const col = db
    .prepare('SELECT * FROM board_columns WHERE id = ?')
    .get(columnId) as unknown as BoardColumn | undefined;
  if (!col) return null;

  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS m FROM cards WHERE column_id = ?'
    )
    .get(columnId) as unknown as { m: number };

  const card: Card = {
    id: nanoid(12),
    column_id: columnId,
    content: content.trim(),
    author_name: authorName.trim(),
    position: maxPos.m + 1,
    created_at: Date.now(),
  };

  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    card.id,
    card.column_id,
    card.content,
    card.author_name,
    card.position,
    card.created_at
  );

  return { ...card, comments: [] };
}

export function moveCard(
  cardId: string,
  toColumnId: string,
  toPosition: number
): { card: Card; boardId: string } | null {
  const card = db
    .prepare('SELECT * FROM cards WHERE id = ?')
    .get(cardId) as unknown as Card | undefined;
  if (!card) return null;

  const targetCol = db
    .prepare('SELECT * FROM board_columns WHERE id = ?')
    .get(toColumnId) as unknown as BoardColumn | undefined;
  if (!targetCol) return null;

  transaction(() => {
    db.prepare(
      'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?'
    ).run(card.column_id, card.position);

    const count = db
      .prepare('SELECT COUNT(*) AS c FROM cards WHERE column_id = ?')
      .get(toColumnId) as unknown as { c: number };
    const insertPos = Math.max(0, Math.min(toPosition, count.c));

    db.prepare(
      'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
    ).run(toColumnId, insertPos);

    db.prepare(
      'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
    ).run(toColumnId, insertPos, cardId);
  });

  const updated = db
    .prepare('SELECT * FROM cards WHERE id = ?')
    .get(cardId) as unknown as Card;

  const boardRow = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(toColumnId) as unknown as { board_id: string };

  return { card: updated, boardId: boardRow.board_id };
}

export function addComment(
  cardId: string,
  content: string,
  authorName: string
): (Comment & { boardId: string }) | null {
  const boardRow = db
    .prepare(
      `SELECT bc.board_id FROM cards c
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId) as unknown as { board_id: string } | undefined;
  if (!boardRow) return null;

  const comment: Comment = {
    id: nanoid(12),
    card_id: cardId,
    content: content.trim(),
    author_name: authorName.trim(),
    created_at: Date.now(),
  };

  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(
    comment.id,
    comment.card_id,
    comment.content,
    comment.author_name,
    comment.created_at
  );

  return { ...comment, boardId: boardRow.board_id };
}

export function getBoardIdForColumn(columnId: string): string | null {
  const row = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(columnId) as unknown as { board_id: string } | undefined;
  return row?.board_id ?? null;
}
