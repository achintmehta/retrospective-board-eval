import { nanoid } from 'nanoid';
import { db, transaction } from './db.js';

const now = () => Date.now();
const newId = () => nanoid(12);

const DEFAULT_COLUMNS = [
  'Went Well',
  'Needs Improvement',
  'Action Items',
];

// ---------- Boards ----------

export function createBoard({ title }) {
  const trimmed = (title || '').trim();
  if (!trimmed) throw new ValidationError('Board title is required');
  if (trimmed.length > 120) throw new ValidationError('Board title is too long');

  const id = newId();
  const createdAt = now();

  transaction(() => {
    db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)')
      .run(id, trimmed, createdAt);

    const insertCol = db.prepare(
      'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    DEFAULT_COLUMNS.forEach((columnTitle, idx) => {
      insertCol.run(newId(), id, columnTitle, idx, createdAt);
    });
  });

  return getBoard(id);
}

export function listBoards() {
  const boards = db.prepare(
    'SELECT id, title, created_at AS createdAt FROM boards ORDER BY created_at DESC'
  ).all();

  if (boards.length === 0) return [];

  const counts = db.prepare(`
    SELECT b.id AS boardId,
           COUNT(DISTINCT c.id) AS cardCount,
           COUNT(DISTINCT cm.id) AS commentCount
    FROM boards b
    LEFT JOIN board_columns col ON col.board_id = b.id
    LEFT JOIN cards c ON c.column_id = col.id
    LEFT JOIN comments cm ON cm.card_id = c.id
    GROUP BY b.id
  `).all();
  const byId = new Map(counts.map((c) => [c.boardId, c]));

  return boards.map((b) => ({
    ...b,
    cardCount: byId.get(b.id)?.cardCount ?? 0,
    commentCount: byId.get(b.id)?.commentCount ?? 0,
  }));
}

export function getBoard(boardId) {
  const board = db.prepare(
    'SELECT id, title, created_at AS createdAt FROM boards WHERE id = ?'
  ).get(boardId);
  if (!board) return null;

  const columns = db.prepare(`
    SELECT id, board_id AS boardId, title, position, created_at AS createdAt
    FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC
  `).all(boardId);

  const columnIds = columns.map((c) => c.id);

  const cards = columnIds.length
    ? db.prepare(`
        SELECT id, column_id AS columnId, content, author_name AS authorName,
               position, created_at AS createdAt
        FROM cards
        WHERE column_id IN (${columnIds.map(() => '?').join(',')})
        ORDER BY position ASC, created_at ASC
      `).all(...columnIds)
    : [];

  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db.prepare(`
        SELECT id, card_id AS cardId, content, author_name AS authorName,
               created_at AS createdAt
        FROM comments
        WHERE card_id IN (${cardIds.map(() => '?').join(',')})
        ORDER BY created_at ASC
      `).all(...cardIds)
    : [];

  const commentsByCard = new Map();
  for (const comment of comments) {
    if (!commentsByCard.has(comment.cardId)) commentsByCard.set(comment.cardId, []);
    commentsByCard.get(comment.cardId).push(comment);
  }

  const cardsByColumn = new Map();
  for (const card of cards) {
    const enriched = { ...card, comments: commentsByCard.get(card.id) ?? [] };
    if (!cardsByColumn.has(card.columnId)) cardsByColumn.set(card.columnId, []);
    cardsByColumn.get(card.columnId).push(enriched);
  }

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) ?? [],
    })),
  };
}

// ---------- Columns ----------

export function createColumn({ boardId, title }) {
  const trimmed = (title || '').trim();
  if (!trimmed) throw new ValidationError('Column title is required');
  if (trimmed.length > 80) throw new ValidationError('Column title is too long');

  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) throw new NotFoundError('Board not found');

  const max = db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS maxPos FROM board_columns WHERE board_id = ?'
  ).get(boardId);

  const id = newId();
  const createdAt = now();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, boardId, trimmed, max.maxPos + 1, createdAt);

  return {
    id,
    boardId,
    title: trimmed,
    position: max.maxPos + 1,
    createdAt,
    cards: [],
  };
}

// ---------- Cards ----------

export function addCard({ boardId, columnId, content, authorName }) {
  const trimmedContent = (content || '').trim();
  const trimmedAuthor = (authorName || '').trim();
  if (!trimmedContent) throw new ValidationError('Card content is required');
  if (trimmedContent.length > 2000) throw new ValidationError('Card content is too long');
  if (!trimmedAuthor) throw new ValidationError('Author name is required');

  const column = db.prepare(
    'SELECT id, board_id AS boardId FROM board_columns WHERE id = ?'
  ).get(columnId);
  if (!column) throw new NotFoundError('Column not found');
  if (boardId && column.boardId !== boardId) {
    throw new ValidationError('Column does not belong to board');
  }

  const max = db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS maxPos FROM cards WHERE column_id = ?'
  ).get(columnId);

  const id = newId();
  const createdAt = now();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, trimmedContent, trimmedAuthor, max.maxPos + 1, createdAt);

  return {
    id,
    columnId,
    content: trimmedContent,
    authorName: trimmedAuthor,
    position: max.maxPos + 1,
    createdAt,
    comments: [],
  };
}

/**
 * Move a card. `toIndex` is the desired index within the destination column
 * AFTER removing the card from its source column. Re-numbers positions to
 * stay dense (0..N-1).
 *
 * Returns { card, sourceColumnId, destinationColumnId, sourceOrder, destinationOrder }.
 */
export function moveCard({ cardId, toColumnId, toIndex }) {
  const card = db.prepare(
    'SELECT id, column_id AS columnId FROM cards WHERE id = ?'
  ).get(cardId);
  if (!card) throw new NotFoundError('Card not found');

  const dest = db.prepare(
    'SELECT id, board_id AS boardId FROM board_columns WHERE id = ?'
  ).get(toColumnId);
  if (!dest) throw new NotFoundError('Destination column not found');

  const fromColumnId = card.columnId;
  const safeIndex = Math.max(0, Number.isInteger(toIndex) ? toIndex : 0);

  transaction(() => {
    const sourceCards = db.prepare(
      'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
    ).all(fromColumnId).filter((c) => c.id !== cardId);

    const destCards = fromColumnId === toColumnId
      ? sourceCards
      : db.prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        ).all(toColumnId);

    const insertAt = Math.min(safeIndex, destCards.length);
    destCards.splice(insertAt, 0, { id: cardId });

    const updatePos = db.prepare('UPDATE cards SET position = ?, column_id = ? WHERE id = ?');

    if (fromColumnId !== toColumnId) {
      sourceCards.forEach((c, idx) => updatePos.run(idx, fromColumnId, c.id));
    }
    destCards.forEach((c, idx) => updatePos.run(idx, toColumnId, c.id));
  });

  const updatedCard = db.prepare(`
    SELECT id, column_id AS columnId, content, author_name AS authorName,
           position, created_at AS createdAt
    FROM cards WHERE id = ?
  `).get(cardId);

  const sourceOrder = db.prepare(
    'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC'
  ).all(fromColumnId).map((c) => c.id);
  const destinationOrder = fromColumnId === toColumnId
    ? sourceOrder
    : db.prepare(
        'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC'
      ).all(toColumnId).map((c) => c.id);

  return {
    card: updatedCard,
    sourceColumnId: fromColumnId,
    destinationColumnId: toColumnId,
    sourceOrder,
    destinationOrder,
  };
}

// ---------- Comments ----------

export function addComment({ cardId, content, authorName }) {
  const trimmedContent = (content || '').trim();
  const trimmedAuthor = (authorName || '').trim();
  if (!trimmedContent) throw new ValidationError('Comment content is required');
  if (trimmedContent.length > 2000) throw new ValidationError('Comment is too long');
  if (!trimmedAuthor) throw new ValidationError('Author name is required');

  const card = db.prepare(
    'SELECT id, column_id AS columnId FROM cards WHERE id = ?'
  ).get(cardId);
  if (!card) throw new NotFoundError('Card not found');

  const id = newId();
  const createdAt = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, trimmedContent, trimmedAuthor, createdAt);

  const boardId = db.prepare(
    'SELECT board_id AS boardId FROM board_columns WHERE id = ?'
  ).get(card.columnId).boardId;

  return {
    comment: {
      id,
      cardId,
      content: trimmedContent,
      authorName: trimmedAuthor,
      createdAt,
    },
    boardId,
    columnId: card.columnId,
  };
}

// ---------- Helpers for export ----------

export function getBoardForExport(boardId) {
  return getBoard(boardId);
}

export function getBoardIdForColumn(columnId) {
  const row = db.prepare(
    'SELECT board_id AS boardId FROM board_columns WHERE id = ?'
  ).get(columnId);
  return row?.boardId ?? null;
}

export function getBoardIdForCard(cardId) {
  const row = db.prepare(`
    SELECT col.board_id AS boardId
    FROM cards c JOIN board_columns col ON col.id = c.column_id
    WHERE c.id = ?
  `).get(cardId);
  return row?.boardId ?? null;
}

// ---------- Errors ----------

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}
