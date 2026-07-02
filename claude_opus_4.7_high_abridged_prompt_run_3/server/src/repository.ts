import { nanoid } from 'nanoid';
import { db, transaction } from './db.js';
import type {
  Board,
  BoardColumn,
  Card,
  Comment,
  BoardWithChildren,
} from './types.js';

const now = () => Date.now();
const id = () => nanoid(12);

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export function createBoard(title: string): Board {
  const board: Board = { id: id(), title: title.trim(), created_at: now() };

  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  transaction(() => {
    insertBoard.run(board.id, board.title, board.created_at);
    DEFAULT_COLUMNS.forEach((columnTitle, index) => {
      insertColumn.run(id(), board.id, columnTitle, index, now());
    });
  });

  return board;
}

export function listBoards(): Board[] {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all() as unknown as Board[];
}

export function getBoard(boardId: string): Board | undefined {
  return db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId) as unknown as Board | undefined;
}

export function getBoardWithChildren(boardId: string): BoardWithChildren | undefined {
  const board = getBoard(boardId);
  if (!board) return undefined;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
    )
    .all(boardId) as unknown as BoardColumn[];

  const cards = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
       FROM cards c
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE bc.board_id = ?
       ORDER BY c.position ASC, c.created_at ASC`
    )
    .all(boardId) as unknown as Card[];

  const comments = db
    .prepare(
      `SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
       FROM comments cm
       JOIN cards c ON c.id = cm.card_id
       JOIN board_columns bc ON bc.id = c.column_id
       WHERE bc.board_id = ?
       ORDER BY cm.created_at ASC`
    )
    .all(boardId) as unknown as Comment[];

  const commentsByCard = new Map<string, Comment[]>();
  for (const c of comments) {
    const list = commentsByCard.get(c.card_id) ?? [];
    list.push(c);
    commentsByCard.set(c.card_id, list);
  }

  const cardsByColumn = new Map<string, (Card & { comments: Comment[] })[]>();
  for (const c of cards) {
    const list = cardsByColumn.get(c.column_id) ?? [];
    list.push({ ...c, comments: commentsByCard.get(c.id) ?? [] });
    cardsByColumn.set(c.column_id, list);
  }

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) ?? [],
    })),
  };
}

export function createColumn(boardId: string, title: string): BoardColumn | undefined {
  if (!getBoard(boardId)) return undefined;

  const nextRow = db
    .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM board_columns WHERE board_id = ?')
    .get(boardId) as unknown as { next: number };
  const position = nextRow.next;

  const col: BoardColumn = {
    id: id(),
    board_id: boardId,
    title: title.trim(),
    position,
    created_at: now(),
  };
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(col.id, col.board_id, col.title, col.position, col.created_at);
  return col;
}

export function getColumn(columnId: string): BoardColumn | undefined {
  return db
    .prepare(
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?'
    )
    .get(columnId) as unknown as BoardColumn | undefined;
}

export function createCard(
  columnId: string,
  content: string,
  authorName: string
): Card | undefined {
  if (!getColumn(columnId)) return undefined;

  const nextRow = db
    .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE column_id = ?')
    .get(columnId) as unknown as { next: number };
  const position = nextRow.next;

  const card: Card = {
    id: id(),
    column_id: columnId,
    content: content.trim(),
    author_name: authorName.trim() || 'Guest',
    position,
    created_at: now(),
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
  return card;
}

export function moveCard(
  cardId: string,
  toColumnId: string,
  newPosition: number
): { card: Card; boardId: string } | undefined {
  const card = db
    .prepare('SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?')
    .get(cardId) as unknown as Card | undefined;
  if (!card) return undefined;

  const targetCol = getColumn(toColumnId);
  if (!targetCol) return undefined;

  const fromColumnId = card.column_id;
  const fromPosition = card.position;

  transaction(() => {
    if (fromColumnId === toColumnId) {
      if (newPosition === fromPosition) return;
      if (newPosition > fromPosition) {
        db.prepare(
          `UPDATE cards SET position = position - 1
           WHERE column_id = ? AND position > ? AND position <= ?`
        ).run(toColumnId, fromPosition, newPosition);
      } else {
        db.prepare(
          `UPDATE cards SET position = position + 1
           WHERE column_id = ? AND position >= ? AND position < ?`
        ).run(toColumnId, newPosition, fromPosition);
      }
    } else {
      db.prepare(
        `UPDATE cards SET position = position - 1
         WHERE column_id = ? AND position > ?`
      ).run(fromColumnId, fromPosition);
      db.prepare(
        `UPDATE cards SET position = position + 1
         WHERE column_id = ? AND position >= ?`
      ).run(toColumnId, newPosition);
    }
    db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
      toColumnId,
      newPosition,
      cardId
    );
  });

  const updated = db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId) as unknown as Card;

  return { card: updated, boardId: targetCol.board_id };
}

export function getCard(cardId: string): Card | undefined {
  return db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId) as unknown as Card | undefined;
}

export function createComment(
  cardId: string,
  content: string,
  authorName: string
): Comment | undefined {
  if (!getCard(cardId)) return undefined;
  const comment: Comment = {
    id: id(),
    card_id: cardId,
    content: content.trim(),
    author_name: authorName.trim() || 'Guest',
    created_at: now(),
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
  return comment;
}

export function getBoardIdForColumn(columnId: string): string | undefined {
  return getColumn(columnId)?.board_id;
}

export function getBoardIdForCard(cardId: string): string | undefined {
  const row = db
    .prepare(
      `SELECT bc.board_id AS board_id
       FROM cards c JOIN board_columns bc ON bc.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId) as unknown as { board_id: string } | undefined;
  return row?.board_id;
}
