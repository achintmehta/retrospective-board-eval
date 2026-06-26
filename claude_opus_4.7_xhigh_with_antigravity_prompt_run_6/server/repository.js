import { randomUUID } from 'node:crypto';
import { db } from './db.js';

const now = () => Date.now();
const newId = () => randomUUID();

const DEFAULT_COLUMNS = [
  'Went Well',
  'Needs Improvement',
  'Action Items'
];

// ---------- Boards ----------

export function createBoard(title, columns = DEFAULT_COLUMNS) {
  const trimmed = (title || '').trim();
  if (!trimmed) throw new Error('Board title is required');

  const id = newId();
  const createdAt = now();

  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    insertBoard.run(id, trimmed, createdAt);
    const cols = (columns && columns.length ? columns : DEFAULT_COLUMNS)
      .map((c) => (typeof c === 'string' ? c.trim() : ''))
      .filter(Boolean);
    cols.forEach((title, idx) => {
      insertColumn.run(newId(), id, title, idx, createdAt);
    });
  });

  tx();
  return getBoard(id);
}

export function listBoards() {
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM cards c
                 JOIN board_columns col ON col.id = c.column_id
                 WHERE col.board_id = b.id) AS card_count
         FROM boards b
        ORDER BY b.created_at DESC`
    )
    .all();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    cardCount: r.card_count
  }));
}

export function getBoard(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
    )
    .all(boardId);

  const colIds = columns.map((c) => c.id);
  const cards = colIds.length
    ? db
        .prepare(
          `SELECT id, column_id, content, author_name, position, created_at
             FROM cards
            WHERE column_id IN (${colIds.map(() => '?').join(',')})
            ORDER BY position ASC, created_at ASC`
        )
        .all(...colIds)
    : [];

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
  for (const cm of comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push({
      id: cm.id,
      cardId: cm.card_id,
      content: cm.content,
      authorName: cm.author_name,
      createdAt: cm.created_at
    });
  }

  const cardsByColumn = new Map();
  for (const c of cards) {
    if (!cardsByColumn.has(c.column_id)) cardsByColumn.set(c.column_id, []);
    cardsByColumn.get(c.column_id).push({
      id: c.id,
      columnId: c.column_id,
      content: c.content,
      authorName: c.author_name,
      position: c.position,
      createdAt: c.created_at,
      comments: commentsByCard.get(c.id) || []
    });
  }

  return {
    id: board.id,
    title: board.title,
    createdAt: board.created_at,
    columns: columns.map((col) => ({
      id: col.id,
      title: col.title,
      position: col.position,
      createdAt: col.created_at,
      cards: cardsByColumn.get(col.id) || []
    }))
  };
}

// ---------- Columns ----------

export function createColumn(boardId, title) {
  const trimmed = (title || '').trim();
  if (!trimmed) throw new Error('Column title is required');

  const exists = db
    .prepare('SELECT id FROM boards WHERE id = ?')
    .get(boardId);
  if (!exists) throw new Error('Board not found');

  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM board_columns WHERE board_id = ?'
    )
    .get(boardId).max_pos;

  const id = newId();
  const createdAt = now();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, boardId, trimmed, maxPos + 1, createdAt);

  return {
    id,
    boardId,
    title: trimmed,
    position: maxPos + 1,
    createdAt,
    cards: []
  };
}

export function getColumn(columnId) {
  const row = db
    .prepare(
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?'
    )
    .get(columnId);
  if (!row) return null;
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
    createdAt: row.created_at
  };
}

// ---------- Cards ----------

export function createCard(columnId, content, authorName) {
  const trimmedContent = (content || '').trim();
  const trimmedAuthor = (authorName || '').trim();
  if (!trimmedContent) throw new Error('Card content is required');
  if (!trimmedAuthor) throw new Error('Author name is required');

  const column = getColumn(columnId);
  if (!column) throw new Error('Column not found');

  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?'
    )
    .get(columnId).max_pos;

  const id = newId();
  const createdAt = now();
  const position = maxPos + 1;

  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, trimmedContent, trimmedAuthor, position, createdAt);

  return {
    id,
    columnId,
    boardId: column.boardId,
    content: trimmedContent,
    authorName: trimmedAuthor,
    position,
    createdAt,
    comments: []
  };
}

export function getCard(cardId) {
  const row = db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId);
  if (!row) return null;
  return {
    id: row.id,
    columnId: row.column_id,
    content: row.content,
    authorName: row.author_name,
    position: row.position,
    createdAt: row.created_at
  };
}

/**
 * Move a card. Computes a stable ordering by re-numbering positions
 * inside the affected column(s).
 */
export function moveCard(cardId, toColumnId, toIndex) {
  const card = getCard(cardId);
  if (!card) throw new Error('Card not found');
  const targetColumn = getColumn(toColumnId);
  if (!targetColumn) throw new Error('Target column not found');

  const fromColumnId = card.columnId;
  const sourceColumn = fromColumnId === toColumnId ? targetColumn : getColumn(fromColumnId);
  if (!sourceColumn) throw new Error('Source column not found');
  if (sourceColumn.boardId !== targetColumn.boardId) {
    throw new Error('Cannot move card across boards');
  }

  const tx = db.transaction(() => {
    if (fromColumnId === toColumnId) {
      const cards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        )
        .all(toColumnId)
        .map((r) => r.id)
        .filter((id) => id !== cardId);
      const clampedIndex = Math.max(0, Math.min(toIndex, cards.length));
      cards.splice(clampedIndex, 0, cardId);
      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      cards.forEach((id, idx) => update.run(idx, id));
    } else {
      const sourceCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        )
        .all(fromColumnId)
        .map((r) => r.id)
        .filter((id) => id !== cardId);
      const targetCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        )
        .all(toColumnId)
        .map((r) => r.id);
      const clampedIndex = Math.max(0, Math.min(toIndex, targetCards.length));
      targetCards.splice(clampedIndex, 0, cardId);

      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(toColumnId, cardId);

      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      sourceCards.forEach((id, idx) => update.run(idx, id));
      targetCards.forEach((id, idx) => update.run(idx, id));
    }
  });
  tx();

  return {
    cardId,
    boardId: targetColumn.boardId,
    fromColumnId,
    toColumnId,
    toIndex
  };
}

// ---------- Comments ----------

export function createComment(cardId, content, authorName) {
  const trimmedContent = (content || '').trim();
  const trimmedAuthor = (authorName || '').trim();
  if (!trimmedContent) throw new Error('Comment content is required');
  if (!trimmedAuthor) throw new Error('Author name is required');

  const card = getCard(cardId);
  if (!card) throw new Error('Card not found');
  const column = getColumn(card.columnId);

  const id = newId();
  const createdAt = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, trimmedContent, trimmedAuthor, createdAt);

  return {
    id,
    cardId,
    columnId: card.columnId,
    boardId: column ? column.boardId : null,
    content: trimmedContent,
    authorName: trimmedAuthor,
    createdAt
  };
}

// ---------- Export ----------

export function exportBoardRows(boardId) {
  const board = db
    .prepare('SELECT id, title FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const rows = db
    .prepare(
      `SELECT col.title    AS column_title,
              col.position AS column_position,
              c.id         AS card_id,
              c.content    AS card_content,
              c.author_name AS card_author,
              c.position   AS card_position,
              c.created_at AS card_created_at,
              cm.content   AS comment_content,
              cm.author_name AS comment_author,
              cm.created_at AS comment_created_at
         FROM board_columns col
    LEFT JOIN cards c       ON c.column_id = col.id
    LEFT JOIN comments cm   ON cm.card_id = c.id
        WHERE col.board_id = ?
     ORDER BY col.position ASC, c.position ASC, cm.created_at ASC`
    )
    .all(boardId);

  return { board, rows };
}
