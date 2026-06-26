import { db, inTransaction } from './db.js';
import { customAlphabet } from 'nanoid';

const id = customAlphabet('123456789abcdefghijkmnpqrstuvwxyz', 12);

const DEFAULT_COLUMNS = [
  { title: 'Went Well', color: 'emerald' },
  { title: 'Needs Improvement', color: 'amber' },
  { title: 'Action Items', color: 'violet' },
];

/* ============================================================
   Boards
   ============================================================ */

export function listBoards() {
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM board_columns c WHERE c.board_id = b.id) AS column_count,
              (SELECT COUNT(*) FROM cards k
                 JOIN board_columns c ON c.id = k.column_id
                WHERE c.board_id = b.id) AS card_count
         FROM boards b
        ORDER BY b.created_at DESC`,
    )
    .all();
  return rows;
}

export function createBoard(title) {
  const boardId = id();
  const now = Date.now();
  inTransaction(() => {
    db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)').run(
      boardId,
      title.trim(),
      now,
    );
    DEFAULT_COLUMNS.forEach((col, idx) => {
      db.prepare(
        'INSERT INTO board_columns (id, board_id, title, position, color) VALUES (?, ?, ?, ?, ?)',
      ).run(id(), boardId, col.title, idx, col.color);
    });
  });
  return getBoard(boardId);
}

export function getBoard(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, title, position, color FROM board_columns WHERE board_id = ? ORDER BY position ASC',
    )
    .all(boardId);

  const columnIds = columns.map((c) => c.id);
  const cards = columnIds.length
    ? db
        .prepare(
          `SELECT id, column_id, content, author_name, position, created_at
             FROM cards
            WHERE column_id IN (${columnIds.map(() => '?').join(',')})
            ORDER BY position ASC`,
        )
        .all(...columnIds)
    : [];

  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db
        .prepare(
          `SELECT id, card_id, content, author_name, created_at
             FROM comments
            WHERE card_id IN (${cardIds.map(() => '?').join(',')})
            ORDER BY created_at ASC`,
        )
        .all(...cardIds)
    : [];

  // Compose nested structure
  const cardsByCol = new Map();
  cards.forEach((c) => {
    c.comments = [];
    if (!cardsByCol.has(c.column_id)) cardsByCol.set(c.column_id, []);
    cardsByCol.get(c.column_id).push(c);
  });
  const cardById = new Map(cards.map((c) => [c.id, c]));
  comments.forEach((cm) => {
    const card = cardById.get(cm.card_id);
    if (card) card.comments.push(cm);
  });

  return {
    ...board,
    columns: columns.map((col) => ({ ...col, cards: cardsByCol.get(col.id) || [] })),
  };
}

/* ============================================================
   Columns
   ============================================================ */

export function createColumn(boardId, title, color = 'violet') {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;
  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM board_columns WHERE board_id = ?')
    .get(boardId);
  const newId = id();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, color) VALUES (?, ?, ?, ?, ?)',
  ).run(newId, boardId, title.trim(), max.m + 1, color);
  return db
    .prepare('SELECT id, board_id, title, position, color FROM board_columns WHERE id = ?')
    .get(newId);
}

/* ============================================================
   Cards
   ============================================================ */

export function createCard({ columnId, content, authorName }) {
  const col = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!col) return null;
  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM cards WHERE column_id = ?')
    .get(columnId);
  const newId = id();
  const now = Date.now();
  db.prepare(
    `INSERT INTO cards (id, column_id, content, author_name, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(newId, columnId, content.trim(), authorName.trim(), max.m + 1, now);
  const card = db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?',
    )
    .get(newId);
  card.comments = [];
  return { card, boardId: col.board_id };
}

/**
 * Move a card to a new column at a new index, recomputing positions in
 * both the source and destination columns so position values stay packed.
 */
export function moveCard({ cardId, toColumnId, toIndex }) {
  const card = db
    .prepare('SELECT id, column_id FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) return null;

  const targetCol = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(toColumnId);
  if (!targetCol) return null;

  const sourceColId = card.column_id;
  const sourceBoard = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(sourceColId);
  if (!sourceBoard || sourceBoard.board_id !== targetCol.board_id) return null;

  inTransaction(() => {
    db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(toColumnId, cardId);

    const repack = (colId) => {
      const cards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC')
        .all(colId);
      const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      cards.forEach((c, idx) => update.run(idx, c.id));
    };

    // Insert at toIndex by bumping positions of target column cards
    const cardsInTarget = db
      .prepare(
        'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC, created_at ASC',
      )
      .all(toColumnId, cardId);
    const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
    const clampedIndex = Math.max(0, Math.min(toIndex, cardsInTarget.length));
    const ordered = [
      ...cardsInTarget.slice(0, clampedIndex).map((c) => c.id),
      cardId,
      ...cardsInTarget.slice(clampedIndex).map((c) => c.id),
    ];
    ordered.forEach((cid, idx) => update.run(idx, cid));

    if (sourceColId !== toColumnId) repack(sourceColId);
  });

  return {
    boardId: targetCol.board_id,
    cardId,
    fromColumnId: sourceColId,
    toColumnId,
    toIndex,
  };
}

/* ============================================================
   Comments
   ============================================================ */

export function createComment({ cardId, content, authorName }) {
  const card = db
    .prepare(
      `SELECT k.id AS card_id, c.board_id AS board_id
         FROM cards k
         JOIN board_columns c ON c.id = k.column_id
        WHERE k.id = ?`,
    )
    .get(cardId);
  if (!card) return null;
  const newId = id();
  const now = Date.now();
  db.prepare(
    `INSERT INTO comments (id, card_id, content, author_name, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(newId, cardId, content.trim(), authorName.trim(), now);
  const comment = db
    .prepare('SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?')
    .get(newId);
  return { comment, boardId: card.board_id };
}

/* ============================================================
   Export
   ============================================================ */

export function exportBoardRows(boardId) {
  return db
    .prepare(
      `SELECT b.title AS board_title,
              c.title AS column_title,
              k.content AS card_content,
              k.author_name AS card_author,
              k.created_at AS card_created_at,
              cm.content AS comment_content,
              cm.author_name AS comment_author,
              cm.created_at AS comment_created_at
         FROM boards b
         JOIN board_columns c ON c.board_id = b.id
    LEFT JOIN cards k ON k.column_id = c.id
    LEFT JOIN comments cm ON cm.card_id = k.id
        WHERE b.id = ?
     ORDER BY c.position ASC, k.position ASC, cm.created_at ASC`,
    )
    .all(boardId);
}
