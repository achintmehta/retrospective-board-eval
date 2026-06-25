const { nanoid } = require('nanoid');
const db = require('./db');
const { withTransaction } = db;

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

function now() {
  return Date.now();
}

// ---- Boards ----
function createBoard(title) {
  const id = nanoid();
  const createdAt = now();
  const insertBoard = db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)');
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );

  withTransaction(() => {
    insertBoard.run(id, title, createdAt);
    DEFAULT_COLUMNS.forEach((columnTitle, index) => {
      insertColumn.run(nanoid(), id, columnTitle, index);
    });
  });

  return getBoardSummary(id);
}

function listBoards() {
  return db
    .prepare('SELECT id, title, created_at AS createdAt FROM boards ORDER BY created_at DESC')
    .all();
}

function getBoardSummary(id) {
  return db
    .prepare('SELECT id, title, created_at AS createdAt FROM boards WHERE id = ?')
    .get(id);
}

function getBoardWithChildren(boardId) {
  const board = getBoardSummary(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(boardId);

  const cardStmt = db.prepare(
    'SELECT id, column_id AS columnId, content, author_name AS authorName, position, created_at AS createdAt FROM cards WHERE column_id = ? ORDER BY position ASC'
  );
  const commentStmt = db.prepare(
    'SELECT id, card_id AS cardId, content, author_name AS authorName, created_at AS createdAt FROM comments WHERE card_id = ? ORDER BY created_at ASC'
  );

  const columnsOut = columns.map((col) => {
    const cards = cardStmt.all(col.id).map((card) => ({
      ...card,
      comments: commentStmt.all(card.id),
    }));
    return { ...col, cards };
  });

  return { ...board, columns: columnsOut };
}

// ---- Columns ----
function createColumn(boardId, title) {
  const board = getBoardSummary(boardId);
  if (!board) return null;

  const positionRow = db
    .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS nextPos FROM board_columns WHERE board_id = ?')
    .get(boardId);
  const id = nanoid();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, positionRow.nextPos);

  return { id, boardId, title, position: positionRow.nextPos };
}

function getColumn(columnId) {
  return db
    .prepare('SELECT id, board_id AS boardId, title, position FROM board_columns WHERE id = ?')
    .get(columnId);
}

// ---- Cards ----
function createCard({ columnId, content, authorName }) {
  const column = getColumn(columnId);
  if (!column) return null;

  const positionRow = db
    .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS nextPos FROM cards WHERE column_id = ?')
    .get(columnId);
  const id = nanoid();
  const createdAt = now();

  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, positionRow.nextPos, createdAt);

  return {
    id,
    columnId,
    content,
    authorName,
    position: positionRow.nextPos,
    createdAt,
    comments: [],
    boardId: column.boardId,
  };
}

function getCard(cardId) {
  return db
    .prepare(
      'SELECT id, column_id AS columnId, content, author_name AS authorName, position, created_at AS createdAt FROM cards WHERE id = ?'
    )
    .get(cardId);
}

function moveCard({ cardId, toColumnId, toIndex }) {
  const card = getCard(cardId);
  if (!card) return null;
  const targetColumn = getColumn(toColumnId);
  if (!targetColumn) return null;

  const fromColumnId = card.columnId;
  const sameColumn = fromColumnId === toColumnId;

  withTransaction(() => {
    // Pull card out of its column by setting position to -1 temporarily
    db.prepare('UPDATE cards SET position = -1 WHERE id = ?').run(cardId);

    // Compact source column
    const sourceCards = db
      .prepare('SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC')
      .all(fromColumnId, cardId);
    sourceCards.forEach((c, i) => {
      db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(i, c.id);
    });

    // Get target column cards (excluding moved card if same column)
    const targetCards = db
      .prepare('SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC')
      .all(toColumnId, cardId);

    const insertAt = Math.max(0, Math.min(toIndex ?? targetCards.length, targetCards.length));
    targetCards.splice(insertAt, 0, { id: cardId });

    // Now write target column with sequential positions, also updating column_id for moved card
    targetCards.forEach((c, i) => {
      if (c.id === cardId) {
        db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
          toColumnId,
          i,
          cardId
        );
      } else {
        db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(i, c.id);
      }
    });
  });

  return {
    cardId,
    fromColumnId,
    toColumnId,
    toIndex,
    sameColumn,
    boardId: targetColumn.boardId,
  };
}

// ---- Comments ----
function createComment({ cardId, content, authorName }) {
  const card = getCard(cardId);
  if (!card) return null;
  const column = getColumn(card.columnId);

  const id = nanoid();
  const createdAt = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, content, authorName, createdAt);

  return {
    id,
    cardId,
    content,
    authorName,
    createdAt,
    boardId: column.boardId,
  };
}

// ---- Export ----
function getBoardForExport(boardId) {
  return getBoardWithChildren(boardId);
}

module.exports = {
  createBoard,
  listBoards,
  getBoardSummary,
  getBoardWithChildren,
  createColumn,
  getColumn,
  createCard,
  getCard,
  moveCard,
  createComment,
  getBoardForExport,
};
