import { randomUUID } from 'node:crypto';
import { db, inTx } from './db.js';

const now = () => Date.now();

const DEFAULT_COLUMN_TITLES = ['Went Well', 'Needs Improvement', 'Action Items'];

export function createBoard({ title, columnTitles }) {
  const id = randomUUID();
  const createdAt = now();
  const titles = (columnTitles && columnTitles.length > 0)
    ? columnTitles
    : DEFAULT_COLUMN_TITLES;

  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  inTx(() => {
    insertBoard.run(id, title, createdAt);
    titles.forEach((t, idx) => {
      insertColumn.run(randomUUID(), id, t, idx, createdAt);
    });
  });

  return getBoard(id);
}

export function listBoards() {
  return db
    .prepare('SELECT id, title, created_at AS createdAt FROM boards ORDER BY created_at DESC')
    .all();
}

export function getBoard(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at AS createdAt FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id AS boardId, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
    )
    .all(boardId);

  const cards = db
    .prepare(
      `SELECT c.id, c.column_id AS columnId, c.content, c.author_name AS authorName, c.position, c.created_at AS createdAt
       FROM cards c
       JOIN board_columns col ON col.id = c.column_id
       WHERE col.board_id = ?
       ORDER BY c.position ASC, c.created_at ASC`
    )
    .all(boardId);

  const comments = db
    .prepare(
      `SELECT cm.id, cm.card_id AS cardId, cm.content, cm.author_name AS authorName, cm.created_at AS createdAt
       FROM comments cm
       JOIN cards c ON c.id = cm.card_id
       JOIN board_columns col ON col.id = c.column_id
       WHERE col.board_id = ?
       ORDER BY cm.created_at ASC`
    )
    .all(boardId);

  const cardsByColumn = new Map(columns.map((col) => [col.id, []]));
  const commentsByCard = new Map();
  for (const card of cards) {
    if (!cardsByColumn.has(card.columnId)) cardsByColumn.set(card.columnId, []);
    cardsByColumn.get(card.columnId).push({ ...card, comments: [] });
  }
  for (const comment of comments) {
    if (!commentsByCard.has(comment.cardId)) commentsByCard.set(comment.cardId, []);
    commentsByCard.get(comment.cardId).push(comment);
  }

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: (cardsByColumn.get(col.id) || []).map((card) => ({
        ...card,
        comments: commentsByCard.get(card.id) || [],
      })),
    })),
  };
}

export function boardExists(boardId) {
  return !!db.prepare('SELECT 1 FROM boards WHERE id = ?').get(boardId);
}

export function createColumn({ boardId, title }) {
  if (!boardExists(boardId)) return null;
  const id = randomUUID();
  const createdAt = now();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?')
    .get(boardId).max;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, boardId, title, maxPos + 1, createdAt);
  return { id, boardId, title, position: maxPos + 1, createdAt, cards: [] };
}

export function getColumnBoardId(columnId) {
  const row = db
    .prepare('SELECT board_id AS boardId FROM board_columns WHERE id = ?')
    .get(columnId);
  return row ? row.boardId : null;
}

export function getCardBoardId(cardId) {
  const row = db
    .prepare(
      `SELECT col.board_id AS boardId
       FROM cards c JOIN board_columns col ON col.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId);
  return row ? row.boardId : null;
}

export function addCard({ columnId, content, authorName }) {
  const boardId = getColumnBoardId(columnId);
  if (!boardId) return null;
  const id = randomUUID();
  const createdAt = now();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?')
    .get(columnId).max;
  const position = maxPos + 1;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, position, createdAt);
  return {
    boardId,
    card: { id, columnId, content, authorName, position, createdAt, comments: [] },
  };
}

export function moveCard({ cardId, toColumnId, toPosition }) {
  const fromBoardId = getCardBoardId(cardId);
  const toBoardId = getColumnBoardId(toColumnId);
  if (!fromBoardId || !toBoardId || fromBoardId !== toBoardId) return null;

  const fromColumnRow = db
    .prepare('SELECT column_id AS columnId, position FROM cards WHERE id = ?')
    .get(cardId);
  if (!fromColumnRow) return null;

  const fromColumnId = fromColumnRow.columnId;
  const fromPosition = fromColumnRow.position;

  inTx(() => {
    if (fromColumnId === toColumnId) {
      if (toPosition === fromPosition) return;
      if (toPosition > fromPosition) {
        db.prepare(
          'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ? AND position <= ?'
        ).run(fromColumnId, fromPosition, toPosition);
      } else {
        db.prepare(
          'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ? AND position < ?'
        ).run(fromColumnId, toPosition, fromPosition);
      }
      db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(toPosition, cardId);
    } else {
      db.prepare(
        'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?'
      ).run(fromColumnId, fromPosition);
      db.prepare(
        'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
      ).run(toColumnId, toPosition);
      db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
        toColumnId,
        toPosition,
        cardId
      );
    }
  });

  return {
    boardId: toBoardId,
    move: {
      cardId,
      fromColumnId,
      toColumnId,
      fromPosition,
      toPosition,
    },
  };
}

export function addComment({ cardId, content, authorName }) {
  const boardId = getCardBoardId(cardId);
  if (!boardId) return null;
  const id = randomUUID();
  const createdAt = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, content, authorName, createdAt);
  return {
    boardId,
    comment: { id, cardId, content, authorName, createdAt },
  };
}

export function getBoardForExport(boardId) {
  return getBoard(boardId);
}
