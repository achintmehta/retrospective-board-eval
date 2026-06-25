const { customAlphabet } = require('nanoid');
const { db } = require('./db');

const newId = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  12,
);

const DEFAULT_COLUMNS = [
  { title: 'Went Well' },
  { title: 'To Improve' },
  { title: 'Action Items' },
];

// ---------- Boards ----------
function createBoard(title) {
  const id = newId();
  const now = Date.now();
  const cleanTitle = String(title || '').trim().slice(0, 120) || 'Untitled Retro';

  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)',
  );
  const insertCol = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
  );

  const tx = db.transaction(() => {
    insertBoard.run(id, cleanTitle, now);
    DEFAULT_COLUMNS.forEach((col, idx) => {
      insertCol.run(newId(), id, col.title, (idx + 1) * 1000, now);
    });
  });
  tx();
  return getBoardSummary(id);
}

function listBoards() {
  return db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM board_columns c WHERE c.board_id = b.id) AS column_count,
              (SELECT COUNT(*) FROM cards ca
                JOIN board_columns c ON c.id = ca.column_id
                WHERE c.board_id = b.id) AS card_count
       FROM boards b
       ORDER BY b.created_at DESC`,
    )
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
      'SELECT id, board_id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC',
    )
    .all(boardId);

  const colIds = columns.map((c) => c.id);
  let cards = [];
  let comments = [];

  if (colIds.length) {
    const placeholders = colIds.map(() => '?').join(',');
    cards = db
      .prepare(
        `SELECT id, column_id, content, author_name, position, created_at
         FROM cards WHERE column_id IN (${placeholders})
         ORDER BY position ASC`,
      )
      .all(...colIds);

    const cardIds = cards.map((c) => c.id);
    if (cardIds.length) {
      const cph = cardIds.map(() => '?').join(',');
      comments = db
        .prepare(
          `SELECT id, card_id, content, author_name, created_at
           FROM comments WHERE card_id IN (${cph})
           ORDER BY created_at ASC`,
        )
        .all(...cardIds);
    }
  }

  // Nest comments under cards and cards under columns
  const commentsByCard = new Map();
  for (const c of comments) {
    if (!commentsByCard.has(c.card_id)) commentsByCard.set(c.card_id, []);
    commentsByCard.get(c.card_id).push(c);
  }
  const cardsWithComments = cards.map((card) => ({
    ...card,
    comments: commentsByCard.get(card.id) || [],
  }));
  const cardsByColumn = new Map();
  for (const card of cardsWithComments) {
    if (!cardsByColumn.has(card.column_id)) cardsByColumn.set(card.column_id, []);
    cardsByColumn.get(card.column_id).push(card);
  }
  const columnsWithCards = columns.map((col) => ({
    ...col,
    cards: cardsByColumn.get(col.id) || [],
  }));

  return { ...board, columns: columnsWithCards };
}

// ---------- Columns ----------
function createColumn(boardId, title) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const clean = String(title || '').trim().slice(0, 80);
  if (!clean) return null;

  const id = newId();
  const now = Date.now();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), 0) AS m FROM board_columns WHERE board_id = ?')
    .get(boardId).m;
  const position = maxPos + 1000;

  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, boardId, clean, position, now);

  return db
    .prepare('SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?')
    .get(id);
}

function getColumn(columnId) {
  return db
    .prepare('SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?')
    .get(columnId);
}

// ---------- Cards ----------
function createCard({ columnId, content, authorName }) {
  const col = getColumn(columnId);
  if (!col) return null;
  const cleanContent = String(content || '').trim().slice(0, 1000);
  const cleanAuthor = String(authorName || '').trim().slice(0, 40) || 'Anonymous';
  if (!cleanContent) return null;

  const id = newId();
  const now = Date.now();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), 0) AS m FROM cards WHERE column_id = ?')
    .get(columnId).m;
  const position = maxPos + 1000;

  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, columnId, cleanContent, cleanAuthor, position, now);

  const card = db
    .prepare('SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?')
    .get(id);
  return { ...card, boardId: col.board_id, comments: [] };
}

function getCard(cardId) {
  return db
    .prepare('SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?')
    .get(cardId);
}

/**
 * Move a card to a new column at a specific index. Recomputes positions in the
 * destination column to keep them spaced and stable.
 */
function moveCard({ cardId, toColumnId, toIndex }) {
  const card = getCard(cardId);
  if (!card) return null;
  const destCol = getColumn(toColumnId);
  if (!destCol) return null;

  const tx = db.transaction(() => {
    // Pull current cards in destination, excluding the moving card
    const destCards = db
      .prepare(
        'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC',
      )
      .all(toColumnId, cardId)
      .map((r) => r.id);

    const insertAt = Math.max(0, Math.min(toIndex ?? destCards.length, destCards.length));
    destCards.splice(insertAt, 0, cardId);

    const update = db.prepare(
      'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
    );
    destCards.forEach((id, idx) => {
      update.run(toColumnId, (idx + 1) * 1000, id);
    });
  });
  tx();

  const updated = getCard(cardId);
  return { ...updated, boardId: destCol.board_id };
}

// ---------- Comments ----------
function createComment({ cardId, content, authorName }) {
  const card = getCard(cardId);
  if (!card) return null;
  const cleanContent = String(content || '').trim().slice(0, 1000);
  const cleanAuthor = String(authorName || '').trim().slice(0, 40) || 'Anonymous';
  if (!cleanContent) return null;

  const id = newId();
  const now = Date.now();

  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, cardId, cleanContent, cleanAuthor, now);

  const col = getColumn(card.column_id);
  const comment = db
    .prepare('SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?')
    .get(id);
  return { ...comment, boardId: col ? col.board_id : null };
}

// ---------- Lookups for boards ----------
function getBoardIdForColumn(columnId) {
  const col = getColumn(columnId);
  return col ? col.board_id : null;
}
function getBoardIdForCard(cardId) {
  const card = getCard(cardId);
  if (!card) return null;
  return getBoardIdForColumn(card.column_id);
}

module.exports = {
  createBoard,
  listBoards,
  getBoardSummary,
  getFullBoard,
  createColumn,
  getColumn,
  createCard,
  getCard,
  moveCard,
  createComment,
  getBoardIdForColumn,
  getBoardIdForCard,
};
