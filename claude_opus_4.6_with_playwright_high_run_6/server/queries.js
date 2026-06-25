const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

function createBoard(title) {
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(id, title);
  return getBoard(id);
}

function getAllBoards() {
  const db = getDb();
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoard(id) {
  const db = getDb();
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  if (!board) return null;

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position'
  ).all(id);

  for (const col of columns) {
    col.cards = db.prepare(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position'
    ).all(col.id);

    for (const card of col.cards) {
      card.comments = db.prepare(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at'
      ).all(card.id);
    }
  }

  board.columns = columns;
  return board;
}

function createColumn(boardId, title) {
  const db = getDb();
  const id = uuidv4();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM board_columns WHERE board_id = ?'
  ).get(boardId);
  const position = maxPos.max + 1;
  db.prepare('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(id, boardId, title, position);
  return { id, board_id: boardId, title, position, cards: [] };
}

function createCard(columnId, content, authorName) {
  const db = getDb();
  const id = uuidv4();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as max FROM cards WHERE column_id = ?'
  ).get(columnId);
  const position = maxPos.max + 1;
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO cards (id, column_id, content, author_name, created_at, position) VALUES (?, ?, ?, ?, ?, ?)').run(id, columnId, content, authorName, createdAt, position);
  return { id, column_id: columnId, content, author_name: authorName, created_at: createdAt, position, comments: [] };
}

function moveCard(cardId, targetColumnId, targetPosition) {
  const db = getDb();
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;

  const sourceColumnId = card.column_id;

  if (sourceColumnId === targetColumnId) {
    const cards = db.prepare(
      'SELECT id, position FROM cards WHERE column_id = ? ORDER BY position'
    ).all(sourceColumnId);

    const filtered = cards.filter(c => c.id !== cardId);
    filtered.splice(targetPosition, 0, { id: cardId });

    const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
    const updateAll = db.transaction(() => {
      filtered.forEach((c, idx) => update.run(idx, c.id));
    });
    updateAll();
  } else {
    db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(targetColumnId, targetPosition, cardId);

    const sourcCards = db.prepare(
      'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position'
    ).all(sourceColumnId, cardId);
    const updatePos = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
    const reorder = db.transaction(() => {
      sourcCards.forEach((c, idx) => updatePos.run(idx, c.id));
      const targetCards = db.prepare(
        'SELECT id FROM cards WHERE column_id = ? ORDER BY position'
      ).all(targetColumnId);
      targetCards.forEach((c, idx) => updatePos.run(idx, c.id));
    });
    reorder();
  }

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

function createComment(cardId, content, authorName) {
  const db = getDb();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)').run(id, cardId, content, authorName, createdAt);
  return { id, card_id: cardId, content, author_name: authorName, created_at: createdAt };
}

function getBoardForExport(boardId) {
  const db = getDb();
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const rows = db.prepare(`
    SELECT
      bc.title as column_title,
      c.content as card_content,
      c.author_name as card_author,
      c.created_at as card_created_at,
      cm.content as comment_content,
      cm.author_name as comment_author,
      cm.created_at as comment_created_at
    FROM board_columns bc
    LEFT JOIN cards c ON c.column_id = bc.id
    LEFT JOIN comments cm ON cm.card_id = c.id
    WHERE bc.board_id = ?
    ORDER BY bc.position, c.position, cm.created_at
  `).all(boardId);

  return { board, rows };
}

module.exports = {
  createBoard,
  getAllBoards,
  getBoard,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardForExport,
};
