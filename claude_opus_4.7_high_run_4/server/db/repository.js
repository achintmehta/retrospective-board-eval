const crypto = require('crypto');
const db = require('./index');

const newId = () => crypto.randomUUID();

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

// ----- Boards ----------------------------------------------------------------

const insertBoard = db.prepare(
  'INSERT INTO boards (id, title) VALUES (?, ?)'
);
const selectBoards = db.prepare(
  'SELECT id, title, created_at FROM boards ORDER BY created_at DESC'
);
const selectBoard = db.prepare(
  'SELECT id, title, created_at FROM boards WHERE id = ?'
);

function createBoard(title, columnTitles = DEFAULT_COLUMNS) {
  const id = newId();
  const tx = db.transaction(() => {
    insertBoard.run(id, title);
    columnTitles.forEach((colTitle, idx) => {
      createColumn(id, colTitle, idx);
    });
  });
  tx();
  return getBoard(id);
}

function listBoards() {
  return selectBoards.all();
}

function getBoard(id) {
  const board = selectBoard.get(id);
  if (!board) return null;
  const columns = listColumns(id).map((column) => ({
    ...column,
    cards: listCards(column.id).map((card) => ({
      ...card,
      comments: listComments(card.id),
    })),
  }));
  return { ...board, columns };
}

// ----- Columns ---------------------------------------------------------------

const insertColumn = db.prepare(
  'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
);
const selectColumns = db.prepare(
  'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
);
const selectColumn = db.prepare(
  'SELECT id, board_id, title, position FROM board_columns WHERE id = ?'
);
const countColumns = db.prepare(
  'SELECT COUNT(*) AS n FROM board_columns WHERE board_id = ?'
);

function createColumn(boardId, title, position) {
  const id = newId();
  let pos = position;
  if (pos === undefined || pos === null) {
    pos = countColumns.get(boardId).n;
  }
  insertColumn.run(id, boardId, title, pos);
  return selectColumn.get(id);
}

function listColumns(boardId) {
  return selectColumns.all(boardId);
}

function getColumn(id) {
  return selectColumn.get(id);
}

// ----- Cards -----------------------------------------------------------------

const insertCard = db.prepare(
  'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
);
const selectCards = db.prepare(
  'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE column_id = ? ORDER BY position ASC'
);
const selectCard = db.prepare(
  'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
);
const countCards = db.prepare(
  'SELECT COUNT(*) AS n FROM cards WHERE column_id = ?'
);
const updateCardColumn = db.prepare(
  'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
);
const shiftCardsDown = db.prepare(
  'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
);
const compactCardPositions = db.prepare(`
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_pos
    FROM cards WHERE column_id = ?
  )
  UPDATE cards SET position = (SELECT new_pos FROM ranked WHERE ranked.id = cards.id)
  WHERE column_id = ?
`);

function createCard({ columnId, content, authorName }) {
  const id = newId();
  const position = countCards.get(columnId).n;
  insertCard.run(id, columnId, content, authorName, position);
  return selectCard.get(id);
}

function moveCard({ cardId, toColumnId, toPosition }) {
  const card = selectCard.get(cardId);
  if (!card) return null;
  const tx = db.transaction(() => {
    const sourceColumn = card.column_id;
    // Remove the card from source by setting an obviously unused position,
    // then compact source positions.
    if (sourceColumn === toColumnId) {
      // Same column move: temporarily move out, shift, re-insert.
      updateCardColumn.run(toColumnId, -1, cardId);
      compactCardPositions.run(sourceColumn, sourceColumn);
      const colCount = countCards.get(toColumnId).n; // excludes the -1 card
      const desired = Math.max(0, Math.min(toPosition, colCount - 1));
      shiftCardsDown.run(toColumnId, desired);
      updateCardColumn.run(toColumnId, desired, cardId);
    } else {
      updateCardColumn.run(toColumnId, -1, cardId);
      compactCardPositions.run(sourceColumn, sourceColumn);
      const colCount = countCards.get(toColumnId).n; // excludes the -1 card
      const desired = Math.max(0, Math.min(toPosition, colCount));
      shiftCardsDown.run(toColumnId, desired);
      updateCardColumn.run(toColumnId, desired, cardId);
    }
  });
  tx();
  return selectCard.get(cardId);
}

function listCards(columnId) {
  return selectCards.all(columnId);
}

function getCard(id) {
  return selectCard.get(id);
}

// ----- Comments --------------------------------------------------------------

const insertComment = db.prepare(
  'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
);
const selectComment = db.prepare(
  'SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?'
);
const selectComments = db.prepare(
  'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC'
);

function createComment({ cardId, content, authorName }) {
  const id = newId();
  insertComment.run(id, cardId, content, authorName);
  return selectComment.get(id);
}

function listComments(cardId) {
  return selectComments.all(cardId);
}

module.exports = {
  DEFAULT_COLUMNS,
  createBoard,
  listBoards,
  getBoard,
  createColumn,
  listColumns,
  getColumn,
  createCard,
  moveCard,
  listCards,
  getCard,
  createComment,
  listComments,
};
