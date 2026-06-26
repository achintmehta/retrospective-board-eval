const crypto = require('crypto');
const { db, transaction } = require('./db');

const newId = () => crypto.randomUUID();
const now = () => Date.now();

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

// ---------- Boards ----------

function createBoard(title) {
  const id = newId();
  const ts = now();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const tx = transaction(() => {
    insertBoard.run(id, title, ts);
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      insertColumn.run(newId(), id, colTitle, idx, ts);
    });
  });
  tx();
  return getBoardSummary(id);
}

function listBoards() {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
}

function getBoardSummary(boardId) {
  return db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
}

function getFullBoard(boardId) {
  const board = getBoardSummary(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
    )
    .all(boardId);

  const columnIds = columns.map((c) => c.id);
  const cards = columnIds.length
    ? db
        .prepare(
          `SELECT id, column_id, content, author_name, position, created_at
           FROM cards
           WHERE column_id IN (${columnIds.map(() => '?').join(',')})
           ORDER BY position ASC, created_at ASC`
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
           ORDER BY created_at ASC`
        )
        .all(...cardIds)
    : [];

  const commentsByCard = new Map();
  comments.forEach((c) => {
    if (!commentsByCard.has(c.card_id)) commentsByCard.set(c.card_id, []);
    commentsByCard.get(c.card_id).push(c);
  });

  const cardsByColumn = new Map();
  cards.forEach((c) => {
    if (!cardsByColumn.has(c.column_id)) cardsByColumn.set(c.column_id, []);
    cardsByColumn.get(c.column_id).push({
      ...c,
      comments: commentsByCard.get(c.id) || [],
    });
  });

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: cardsByColumn.get(col.id) || [],
    })),
  };
}

// ---------- Columns ----------

function createColumn(boardId, title) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM board_columns WHERE board_id = ?'
    )
    .get(boardId);
  const id = newId();
  const ts = now();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, boardId, title, row.next_pos, ts);
  return {
    id,
    board_id: boardId,
    title,
    position: row.next_pos,
    created_at: ts,
    cards: [],
  };
}

function getColumn(columnId) {
  return db
    .prepare(
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?'
    )
    .get(columnId);
}

// ---------- Cards ----------

function createCard(columnId, content, authorName) {
  const column = getColumn(columnId);
  if (!column) return null;
  const row = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM cards WHERE column_id = ?'
    )
    .get(columnId);
  const id = newId();
  const ts = now();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, row.next_pos, ts);
  return {
    id,
    column_id: columnId,
    board_id: column.board_id,
    content,
    author_name: authorName,
    position: row.next_pos,
    created_at: ts,
    comments: [],
  };
}

function getCard(cardId) {
  const card = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at, col.board_id
       FROM cards c JOIN board_columns col ON col.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId);
  return card || null;
}

/**
 * Moves a card to a target column at the given index, shifting positions in
 * both the source and target columns so card positions remain contiguous.
 * Returns { card, sourceColumnId, targetColumnId } describing the result, or
 * null if the card or target column do not exist.
 */
function moveCard(cardId, targetColumnId, targetIndex) {
  const card = getCard(cardId);
  if (!card) return null;
  const targetColumn = getColumn(targetColumnId);
  if (!targetColumn) return null;
  if (card.board_id !== targetColumn.board_id) return null;

  const sourceColumnId = card.column_id;
  const idx = Math.max(0, Math.floor(Number(targetIndex) || 0));

  const tx = transaction(() => {
    // Pull the card out of its source column, shifting later cards up by 1.
    db.prepare(
      'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?'
    ).run(sourceColumnId, card.position);

    // Determine the final insert index, clamped to the (now compacted) target
    // column size. If the card is moving within the same column, we already
    // removed it from positions accounting.
    const sizeRow = db
      .prepare('SELECT COUNT(*) AS n FROM cards WHERE column_id = ? AND id != ?')
      .get(targetColumnId, cardId);
    const finalIndex = Math.min(idx, sizeRow.n);

    // Shift target column cards at or after finalIndex down by 1.
    db.prepare(
      'UPDATE cards SET position = position + 1 WHERE column_id = ? AND id != ? AND position >= ?'
    ).run(targetColumnId, cardId, finalIndex);

    // Place the card.
    db.prepare(
      'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
    ).run(targetColumnId, finalIndex, cardId);
  });
  tx();

  return {
    card: getCard(cardId),
    sourceColumnId,
    targetColumnId,
  };
}

// ---------- Comments ----------

function createComment(cardId, content, authorName) {
  const card = getCard(cardId);
  if (!card) return null;
  const id = newId();
  const ts = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, content, authorName, ts);
  return {
    id,
    card_id: cardId,
    board_id: card.board_id,
    content,
    author_name: authorName,
    created_at: ts,
  };
}

// ---------- Export ----------

function getBoardForExport(boardId) {
  return getFullBoard(boardId);
}

module.exports = {
  createBoard,
  listBoards,
  getBoardSummary,
  getFullBoard,
  createColumn,
  createCard,
  getCard,
  moveCard,
  createComment,
  getBoardForExport,
};
