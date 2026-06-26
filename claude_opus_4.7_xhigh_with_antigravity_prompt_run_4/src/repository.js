import { db, transaction } from './db.js';
import { nanoid } from 'nanoid';

const now = () => Date.now();

const DEFAULT_COLUMNS = [
  { title: 'Went Well', position: 0 },
  { title: 'To Improve', position: 1 },
  { title: 'Action Items', position: 2 },
];

// --- Boards ---

export function createBoard({ title }) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) {
    throw new ValidationError('Board title is required');
  }
  const board = {
    id: nanoid(12),
    title: cleanTitle,
    created_at: now(),
  };

  const insertBoard = db.prepare(
    `INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)`
  );
  const insertColumn = db.prepare(
    `INSERT INTO board_columns (id, board_id, title, position, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );

  transaction(() => {
    insertBoard.run(board.id, board.title, board.created_at);
    for (const col of DEFAULT_COLUMNS) {
      insertColumn.run(nanoid(12), board.id, col.title, col.position, now());
    }
  });

  return getBoardSummary(board.id);
}

export function listBoards() {
  return db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM board_columns c WHERE c.board_id = b.id) AS column_count,
              (SELECT COUNT(*) FROM cards k
                 JOIN board_columns c ON c.id = k.column_id
                 WHERE c.board_id = b.id) AS card_count
         FROM boards b
         ORDER BY b.created_at DESC`
    )
    .all();
}

export function getBoardSummary(boardId) {
  return db
    .prepare(`SELECT id, title, created_at FROM boards WHERE id = ?`)
    .get(boardId);
}

export function getFullBoard(boardId) {
  const board = getBoardSummary(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      `SELECT id, title, position FROM board_columns
        WHERE board_id = ? ORDER BY position ASC`
    )
    .all(boardId);

  const cards = db
    .prepare(
      `SELECT k.id, k.column_id, k.content, k.author_name, k.position, k.created_at
         FROM cards k
         JOIN board_columns c ON c.id = k.column_id
        WHERE c.board_id = ?
        ORDER BY k.position ASC`
    )
    .all(boardId);

  const comments = db
    .prepare(
      `SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
         FROM comments cm
         JOIN cards k ON k.id = cm.card_id
         JOIN board_columns c ON c.id = k.column_id
        WHERE c.board_id = ?
        ORDER BY cm.created_at ASC`
    )
    .all(boardId);

  return { ...board, columns, cards, comments };
}

// --- Columns ---

export function createColumn(boardId, { title }) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new ValidationError('Column title is required');
  const board = getBoardSummary(boardId);
  if (!board) throw new NotFoundError('Board not found');

  const nextPosRow = db
    .prepare(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
         FROM board_columns WHERE board_id = ?`
    )
    .get(boardId);

  const column = {
    id: nanoid(12),
    board_id: boardId,
    title: cleanTitle,
    position: Number(nextPosRow.next_pos),
    created_at: now(),
  };

  db.prepare(
    `INSERT INTO board_columns (id, board_id, title, position, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(column.id, column.board_id, column.title, column.position, column.created_at);

  return column;
}

// --- Cards ---

export function createCard({ boardId, columnId, content, authorName }) {
  const cleanContent = String(content || '').trim();
  const cleanAuthor = String(authorName || '').trim() || 'Anonymous';
  if (!cleanContent) throw new ValidationError('Card content is required');

  const column = db
    .prepare(
      `SELECT id, board_id FROM board_columns WHERE id = ? AND board_id = ?`
    )
    .get(columnId, boardId);
  if (!column) throw new NotFoundError('Column not found in this board');

  const nextPosRow = db
    .prepare(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
         FROM cards WHERE column_id = ?`
    )
    .get(columnId);

  const card = {
    id: nanoid(12),
    column_id: columnId,
    content: cleanContent,
    author_name: cleanAuthor,
    position: Number(nextPosRow.next_pos),
    created_at: now(),
  };

  db.prepare(
    `INSERT INTO cards (id, column_id, content, author_name, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
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

/**
 * Move a card to a new column at a new index.
 * Rebuilds the position of cards in BOTH the source and destination columns so they stay dense.
 */
export function moveCard({ boardId, cardId, toColumnId, toIndex }) {
  const card = db
    .prepare(
      `SELECT k.id, k.column_id, k.position, c.board_id
         FROM cards k
         JOIN board_columns c ON c.id = k.column_id
        WHERE k.id = ?`
    )
    .get(cardId);
  if (!card) throw new NotFoundError('Card not found');
  if (card.board_id !== boardId) throw new ValidationError('Card not in this board');

  const targetColumn = db
    .prepare(`SELECT id, board_id FROM board_columns WHERE id = ?`)
    .get(toColumnId);
  if (!targetColumn) throw new NotFoundError('Destination column not found');
  if (targetColumn.board_id !== boardId)
    throw new ValidationError('Destination column not in this board');

  const fromColumnId = card.column_id;

  transaction(() => {
    const destCards = db
      .prepare(`SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC`)
      .all(toColumnId)
      .map((r) => r.id);

    if (fromColumnId === toColumnId) {
      const idx = destCards.indexOf(cardId);
      if (idx >= 0) destCards.splice(idx, 1);
    } else {
      const srcCards = db
        .prepare(`SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC`)
        .all(fromColumnId)
        .map((r) => r.id)
        .filter((id) => id !== cardId);

      const updateSrcPos = db.prepare(`UPDATE cards SET position = ? WHERE id = ?`);
      srcCards.forEach((id, i) => updateSrcPos.run(i, id));
    }

    const clampedIndex = Math.max(0, Math.min(toIndex ?? destCards.length, destCards.length));
    destCards.splice(clampedIndex, 0, cardId);

    if (fromColumnId !== toColumnId) {
      db.prepare(`UPDATE cards SET column_id = ? WHERE id = ?`).run(toColumnId, cardId);
    }

    const updateDestPos = db.prepare(`UPDATE cards SET position = ? WHERE id = ?`);
    destCards.forEach((id, i) => updateDestPos.run(i, id));
  });

  const updatedCard = db
    .prepare(
      `SELECT id, column_id, content, author_name, position, created_at
         FROM cards WHERE id = ?`
    )
    .get(cardId);

  const affectedColumns =
    fromColumnId === toColumnId ? [toColumnId] : [fromColumnId, toColumnId];
  const columnOrders = {};
  for (const colId of affectedColumns) {
    columnOrders[colId] = db
      .prepare(
        `SELECT id, position FROM cards WHERE column_id = ? ORDER BY position ASC`
      )
      .all(colId);
  }

  return { card: updatedCard, fromColumnId, toColumnId, columnOrders };
}

// --- Comments ---

export function createComment({ boardId, cardId, content, authorName }) {
  const cleanContent = String(content || '').trim();
  const cleanAuthor = String(authorName || '').trim() || 'Anonymous';
  if (!cleanContent) throw new ValidationError('Comment content is required');

  const cardRow = db
    .prepare(
      `SELECT k.id, c.board_id
         FROM cards k
         JOIN board_columns c ON c.id = k.column_id
        WHERE k.id = ?`
    )
    .get(cardId);
  if (!cardRow) throw new NotFoundError('Card not found');
  if (cardRow.board_id !== boardId)
    throw new ValidationError('Card does not belong to this board');

  const comment = {
    id: nanoid(12),
    card_id: cardId,
    content: cleanContent,
    author_name: cleanAuthor,
    created_at: now(),
  };

  db.prepare(
    `INSERT INTO comments (id, card_id, content, author_name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    comment.id,
    comment.card_id,
    comment.content,
    comment.author_name,
    comment.created_at
  );

  return comment;
}

// --- Errors ---

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
