const crypto = require('node:crypto');
const db = require('./index');

const newId = () => crypto.randomUUID();

// node:sqlite has no built-in transaction wrapper, so we ship a tiny one. We
// use IMMEDIATE so concurrent writers fail fast instead of deadlocking late.
function withTransaction(fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_e) { /* already rolled back */ }
    throw err;
  }
}

// ---------- Boards ----------

function createBoard(title) {
  const id = newId();
  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(id, title);
  return getBoardSummary(id);
}

function getBoardSummary(id) {
  return db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(id);
}

function listBoards() {
  return db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM cards c
                JOIN board_columns col ON col.id = c.column_id
                WHERE col.board_id = b.id) AS card_count
         FROM boards b
        ORDER BY b.created_at DESC`
    )
    .all();
}

function getFullBoard(id) {
  const board = getBoardSummary(id);
  if (!board) return null;

  const columns = db
    .prepare(
      `SELECT id, board_id, title, position, created_at
         FROM board_columns
        WHERE board_id = ?
        ORDER BY position ASC, created_at ASC`
    )
    .all(id);

  const cards = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
         FROM cards c
         JOIN board_columns col ON col.id = c.column_id
        WHERE col.board_id = ?
        ORDER BY c.position ASC, c.created_at ASC`
    )
    .all(id);

  const cardIds = cards.map((c) => c.id);
  let comments = [];
  if (cardIds.length > 0) {
    const placeholders = cardIds.map(() => '?').join(',');
    comments = db
      .prepare(
        `SELECT id, card_id, content, author_name, created_at
           FROM comments
          WHERE card_id IN (${placeholders})
          ORDER BY created_at ASC`
      )
      .all(...cardIds);
  }

  return { ...board, columns, cards, comments };
}

// ---------- Columns ----------

function createColumn(boardId, title) {
  const board = getBoardSummary(boardId);
  if (!board) return null;

  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM board_columns WHERE board_id = ?'
    )
    .get(boardId);
  const position = (maxPos?.max_pos ?? -1) + 1;

  const id = newId();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, position);

  return db
    .prepare(
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?'
    )
    .get(id);
}

function getColumn(columnId) {
  return db
    .prepare(
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?'
    )
    .get(columnId);
}

// ---------- Cards ----------

function createCard({ columnId, content, authorName }) {
  const col = getColumn(columnId);
  if (!col) return null;

  const maxPos = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM cards WHERE column_id = ?'
    )
    .get(columnId);
  const position = (maxPos?.max_pos ?? -1) + 1;

  const id = newId();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, position);

  return db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(id);
}

function getCard(cardId) {
  return db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId);
}

/**
 * Move a card to a destination column and position.
 * Position handling: simple "insert at index" with renumbering within the
 * affected column(s). This keeps positions dense and easy to reason about.
 */
function moveCard({ cardId, toColumnId, toIndex }) {
  return withTransaction(() => {
    const card = getCard(cardId);
    if (!card) return null;
    const destCol = getColumn(toColumnId);
    if (!destCol) return null;

    const fromColumnId = card.column_id;
    const sameColumn = fromColumnId === toColumnId;

    const sourceCards = db
      .prepare(
        'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC, created_at ASC'
      )
      .all(fromColumnId, cardId)
      .map((r) => r.id);

    let destCards;
    if (sameColumn) {
      destCards = sourceCards.slice();
    } else {
      destCards = db
        .prepare(
          'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC'
        )
        .all(toColumnId)
        .map((r) => r.id);
    }

    const clampedIndex = Math.max(
      0,
      Math.min(destCards.length, toIndex ?? destCards.length)
    );
    destCards.splice(clampedIndex, 0, cardId);

    const updateColAndPos = db.prepare(
      'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
    );
    const updatePos = db.prepare(
      'UPDATE cards SET position = ? WHERE id = ?'
    );

    if (!sameColumn) {
      sourceCards.forEach((id, idx) => updatePos.run(idx, id));
    }
    destCards.forEach((id, idx) => {
      if (id === cardId) {
        updateColAndPos.run(toColumnId, idx, id);
      } else {
        updatePos.run(idx, id);
      }
    });

    return getCard(cardId);
  });
}

// ---------- Comments ----------

function createComment({ cardId, content, authorName }) {
  const card = getCard(cardId);
  if (!card) return null;

  const id = newId();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
  ).run(id, cardId, content, authorName);

  return db
    .prepare(
      'SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?'
    )
    .get(id);
}

function listCommentsForCard(cardId) {
  return db
    .prepare(
      'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC'
    )
    .all(cardId);
}

module.exports = {
  newId,
  withTransaction,
  createBoard,
  getBoardSummary,
  listBoards,
  getFullBoard,
  createColumn,
  getColumn,
  createCard,
  getCard,
  moveCard,
  createComment,
  listCommentsForCard,
};
