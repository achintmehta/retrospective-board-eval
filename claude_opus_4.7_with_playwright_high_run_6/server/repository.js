import { randomUUID } from 'node:crypto';
import db, { transaction } from './db.js';

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

export function createBoard(title) {
  const trimmed = (title || '').trim();
  if (!trimmed) throw new Error('Board title is required');

  const boardId = randomUUID();
  const insertBoard = db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)');
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );

  transaction(() => {
    insertBoard.run(boardId, trimmed);
    DEFAULT_COLUMNS.forEach((title, index) => {
      insertColumn.run(randomUUID(), boardId, title, index);
    });
  });

  return getBoard(boardId);
}

export function listBoards() {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
}

export function getBoard(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(boardId);

  if (columns.length === 0) {
    return { ...board, columns: [] };
  }

  const columnIds = columns.map((c) => c.id);
  const cards = db
    .prepare(
      `SELECT id, column_id, content, author_name, position, created_at
       FROM cards
       WHERE column_id IN (${columnIds.map(() => '?').join(',')})
       ORDER BY position ASC`
    )
    .all(...columnIds);

  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db
        .prepare(
          `SELECT id, card_id, content, author_name, created_at
           FROM comments
           WHERE card_id IN (${cardIds.map(() => '?').join(',')})
           ORDER BY created_at ASC`
        )
        .all(...cardIds)
    : [];

  const commentsByCard = new Map();
  for (const c of comments) {
    if (!commentsByCard.has(c.card_id)) commentsByCard.set(c.card_id, []);
    commentsByCard.get(c.card_id).push(c);
  }

  const cardsByColumn = new Map();
  for (const card of cards) {
    if (!cardsByColumn.has(card.column_id)) cardsByColumn.set(card.column_id, []);
    cardsByColumn.get(card.column_id).push({
      ...card,
      comments: commentsByCard.get(card.id) || [],
    });
  }

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) || [],
    })),
  };
}

export function boardExists(boardId) {
  return Boolean(
    db.prepare('SELECT 1 FROM boards WHERE id = ?').get(boardId)
  );
}

export function createColumn(boardId, title) {
  const trimmed = (title || '').trim();
  if (!trimmed) throw new Error('Column title is required');
  if (!boardExists(boardId)) throw new Error('Board not found');

  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?')
    .get(boardId);

  const columnId = randomUUID();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(columnId, boardId, trimmed, maxPos.max + 1);

  return db
    .prepare('SELECT id, board_id, title, position FROM board_columns WHERE id = ?')
    .get(columnId);
}

export function getColumn(columnId) {
  return db
    .prepare('SELECT id, board_id, title, position FROM board_columns WHERE id = ?')
    .get(columnId);
}

export function addCard({ columnId, content, authorName }) {
  const trimmedContent = (content || '').trim();
  const trimmedAuthor = (authorName || '').trim();
  if (!trimmedContent) throw new Error('Card content is required');
  if (!trimmedAuthor) throw new Error('Author name is required');

  const column = getColumn(columnId);
  if (!column) throw new Error('Column not found');

  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?')
    .get(columnId);

  const cardId = randomUUID();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
  ).run(cardId, columnId, trimmedContent, trimmedAuthor, maxPos.max + 1);

  const card = db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId);

  return { boardId: column.board_id, card: { ...card, comments: [] } };
}

export function moveCard({ cardId, toColumnId, toPosition }) {
  const card = db
    .prepare('SELECT id, column_id FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) throw new Error('Card not found');

  const destColumn = getColumn(toColumnId);
  if (!destColumn) throw new Error('Destination column not found');

  const sourceColumn = getColumn(card.column_id);
  if (!sourceColumn || sourceColumn.board_id !== destColumn.board_id) {
    throw new Error('Cannot move card across boards');
  }

  transaction(() => {
    db.prepare(
      `UPDATE cards SET position = position - 1
       WHERE column_id = ? AND position > (SELECT position FROM cards WHERE id = ?)`
    ).run(card.column_id, cardId);

    db.prepare(
      'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
    ).run(toColumnId, toPosition);

    db.prepare(
      'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
    ).run(toColumnId, toPosition, cardId);
  });

  return {
    boardId: destColumn.board_id,
    cardId,
    fromColumnId: card.column_id,
    toColumnId,
    toPosition,
  };
}

export function addComment({ cardId, content, authorName }) {
  const trimmedContent = (content || '').trim();
  const trimmedAuthor = (authorName || '').trim();
  if (!trimmedContent) throw new Error('Comment content is required');
  if (!trimmedAuthor) throw new Error('Author name is required');

  const card = db
    .prepare('SELECT id, column_id FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) throw new Error('Card not found');

  const column = getColumn(card.column_id);

  const commentId = randomUUID();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
  ).run(commentId, cardId, trimmedContent, trimmedAuthor);

  const comment = db
    .prepare(
      'SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?'
    )
    .get(commentId);

  return { boardId: column.board_id, comment };
}
