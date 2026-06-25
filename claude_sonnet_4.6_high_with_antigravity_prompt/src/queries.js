const { v4: uuidv4 } = require('uuid');
const db = require('./db');

// Boards
const getAllBoards = () =>
  db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();

const getBoardById = (id) =>
  db.prepare('SELECT * FROM boards WHERE id = ?').get(id);

const createBoard = (title) => {
  const id = uuidv4();
  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(id, title);
  return getBoardById(id);
};

// Columns
const getColumnsByBoardId = (boardId) =>
  db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC').all(boardId);

const createColumn = (boardId, title) => {
  const id = uuidv4();
  const maxPos = db.prepare('SELECT MAX(position) as m FROM board_columns WHERE board_id = ?').get(boardId);
  const position = (maxPos.m ?? -1) + 1;
  db.prepare('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(id, boardId, title, position);
  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
};

// Cards
const getCardsByColumnId = (columnId) =>
  db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC').all(columnId);

const getCardById = (id) =>
  db.prepare('SELECT * FROM cards WHERE id = ?').get(id);

const createCard = (columnId, content, authorName) => {
  const id = uuidv4();
  const maxPos = db.prepare('SELECT MAX(position) as m FROM cards WHERE column_id = ?').get(columnId);
  const position = (maxPos.m ?? -1) + 1;
  db.prepare('INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)').run(id, columnId, content, authorName, position);
  return getCardById(id);
};

const moveCard = (cardId, newColumnId, newPosition) => {
  db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(newColumnId, newPosition, cardId);
  return getCardById(cardId);
};

// Comments
const getCommentsByCardId = (cardId) =>
  db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC').all(cardId);

const createComment = (cardId, content, authorName) => {
  const id = uuidv4();
  db.prepare('INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)').run(id, cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
};

// Full board with nested data
const getFullBoard = (boardId) => {
  const board = getBoardById(boardId);
  if (!board) return null;
  const columns = getColumnsByBoardId(boardId).map((col) => {
    const cards = getCardsByColumnId(col.id).map((card) => ({
      ...card,
      comments: getCommentsByCardId(card.id),
    }));
    return { ...col, cards };
  });
  return { ...board, columns };
};

// Export data
const getBoardExportData = (boardId) => {
  return db.prepare(`
    SELECT
      b.title AS board_title,
      bc.title AS column_title,
      c.content AS card_content,
      c.author_name AS card_author,
      c.created_at AS card_created_at,
      cm.content AS comment_content,
      cm.author_name AS comment_author,
      cm.created_at AS comment_created_at
    FROM boards b
    JOIN board_columns bc ON bc.board_id = b.id
    JOIN cards c ON c.column_id = bc.id
    LEFT JOIN comments cm ON cm.card_id = c.id
    WHERE b.id = ?
    ORDER BY bc.position, c.position, cm.created_at
  `).all(boardId);
};

module.exports = {
  getAllBoards,
  getBoardById,
  createBoard,
  getColumnsByBoardId,
  createColumn,
  getCardsByColumnId,
  getCardById,
  createCard,
  moveCard,
  getCommentsByCardId,
  createComment,
  getFullBoard,
  getBoardExportData,
};
