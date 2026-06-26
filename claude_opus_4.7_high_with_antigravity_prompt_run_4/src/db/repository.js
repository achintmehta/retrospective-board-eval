const { nanoid } = require('nanoid');
const { db, transaction } = require('./db');

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

function now() {
  return Date.now();
}

function createBoard(title) {
  const id = nanoid(10);
  const created_at = now();
  transaction(() => {
    db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)').run(id, title, created_at);
    const insertColumn = db.prepare(
      'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
    );
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      insertColumn.run(nanoid(10), id, colTitle, idx, created_at);
    });
  });
  return getBoard(id);
}

function listBoards() {
  return db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM board_columns c WHERE c.board_id = b.id) AS column_count,
              (SELECT COUNT(*) FROM cards cd
                 JOIN board_columns c ON c.id = cd.column_id
                 WHERE c.board_id = b.id) AS card_count
       FROM boards b
       ORDER BY b.created_at DESC`
    )
    .all();
}

function getBoard(boardId) {
  const board = db.prepare('SELECT id, title, created_at FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC'
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

  const commentsByCard = comments.reduce((acc, c) => {
    (acc[c.card_id] ||= []).push(c);
    return acc;
  }, {});
  const cardsByColumn = cards.reduce((acc, card) => {
    const withComments = { ...card, comments: commentsByCard[card.id] || [] };
    (acc[card.column_id] ||= []).push(withComments);
    return acc;
  }, {});

  return {
    ...board,
    columns: columns.map((c) => ({ ...c, cards: cardsByColumn[c.id] || [] })),
  };
}

function createColumn(boardId, title) {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;
  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?')
    .get(boardId).max;
  const id = nanoid(10);
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, boardId, title, max + 1, now());
  return db.prepare('SELECT id, board_id, title, position FROM board_columns WHERE id = ?').get(id);
}

function getColumn(columnId) {
  return db.prepare('SELECT id, board_id, title, position FROM board_columns WHERE id = ?').get(columnId);
}

function addCard({ columnId, content, authorName }) {
  const column = getColumn(columnId);
  if (!column) return null;
  const max = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?')
    .get(columnId).max;
  const id = nanoid(10);
  const created_at = now();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, max + 1, created_at);
  return {
    id,
    column_id: columnId,
    content,
    author_name: authorName,
    position: max + 1,
    created_at,
    comments: [],
    board_id: column.board_id,
  };
}

function moveCard({ cardId, targetColumnId, targetIndex }) {
  const card = db.prepare('SELECT id, column_id FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;
  const targetColumn = getColumn(targetColumnId);
  if (!targetColumn) return null;

  transaction(() => {
    const sourceCards = db
      .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC')
      .all(card.column_id)
      .filter((c) => c.id !== cardId);

    let targetCards =
      card.column_id === targetColumnId
        ? sourceCards
        : db
            .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC')
            .all(targetColumnId);

    const insertIdx = Math.max(0, Math.min(targetIndex, targetCards.length));
    targetCards = [...targetCards.slice(0, insertIdx), { id: cardId }, ...targetCards.slice(insertIdx)];

    db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(targetColumnId, cardId);

    const updatePosition = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
    if (card.column_id !== targetColumnId) {
      sourceCards.forEach((c, i) => updatePosition.run(i, c.id));
    }
    targetCards.forEach((c, i) => updatePosition.run(i, c.id));
  });

  return {
    cardId,
    targetColumnId,
    sourceColumnId: card.column_id,
    boardId: targetColumn.board_id,
    targetIndex,
  };
}

function getCardOwnerBoard(cardId) {
  return db
    .prepare(
      `SELECT c.id AS card_id, col.board_id AS board_id
       FROM cards c
       JOIN board_columns col ON col.id = c.column_id
       WHERE c.id = ?`
    )
    .get(cardId);
}

function addComment({ cardId, content, authorName }) {
  const owner = getCardOwnerBoard(cardId);
  if (!owner) return null;
  const id = nanoid(10);
  const created_at = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, content, authorName, created_at);
  return {
    id,
    card_id: cardId,
    content,
    author_name: authorName,
    created_at,
    board_id: owner.board_id,
  };
}

function getBoardExport(boardId) {
  const board = db.prepare('SELECT id, title, created_at FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;
  const rows = db
    .prepare(
      `SELECT col.title AS column_title,
              cd.content AS card_content,
              cd.author_name AS card_author,
              cd.created_at AS card_created_at,
              cm.content AS comment_content,
              cm.author_name AS comment_author,
              cm.created_at AS comment_created_at
       FROM board_columns col
       LEFT JOIN cards cd ON cd.column_id = col.id
       LEFT JOIN comments cm ON cm.card_id = cd.id
       WHERE col.board_id = ?
       ORDER BY col.position ASC, cd.position ASC, cm.created_at ASC`
    )
    .all(boardId);
  return { board, rows };
}

module.exports = {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  addCard,
  moveCard,
  addComment,
  getBoardExport,
};
