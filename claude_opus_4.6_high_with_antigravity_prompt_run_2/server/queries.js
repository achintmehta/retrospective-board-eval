const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db');

function createBoard(title) {
  const db = getDb();
  const id = uuidv4();
  db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)').run(id, title);
  return db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
}

function getAllBoards() {
  const db = getDb();
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
}

function getBoardById(id) {
  const db = getDb();
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  if (!board) return null;

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC'
  ).all(id);

  for (const col of columns) {
    col.cards = db.prepare(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC'
    ).all(col.id);

    for (const card of col.cards) {
      card.comments = db.prepare(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC'
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
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM board_columns WHERE board_id = ?'
  ).get(boardId);
  const position = (maxPos?.maxPos ?? -1) + 1;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, position);
  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id);
}

function createCard(columnId, content, authorName) {
  const db = getDb();
  const id = uuidv4();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM cards WHERE column_id = ?'
  ).get(columnId);
  const position = (maxPos?.maxPos ?? -1) + 1;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, position);
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  card.comments = [];
  return card;
}

function moveCard(cardId, targetColumnId, targetPosition) {
  const db = getDb();
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;

  const sourceColumnId = card.column_id;

  if (sourceColumnId === targetColumnId) {
    const cards = db.prepare(
      'SELECT id, position FROM cards WHERE column_id = ? ORDER BY position ASC'
    ).all(targetColumnId);

    const filtered = cards.filter(c => c.id !== cardId);
    filtered.splice(targetPosition, 0, { id: cardId });

    const update = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
    const updateMany = db.transaction((items) => {
      items.forEach((item, idx) => update.run(idx, item.id));
    });
    updateMany(filtered);
  } else {
    const sourcCards = db.prepare(
      'SELECT id, position FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC'
    ).all(sourceColumnId, cardId);
    const updateSrc = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
    const reorderSource = db.transaction((items) => {
      items.forEach((item, idx) => updateSrc.run(idx, item.id));
    });
    reorderSource(sourcCards);

    db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(targetColumnId, cardId);

    const destCards = db.prepare(
      'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC'
    ).all(targetColumnId, cardId);
    destCards.splice(targetPosition, 0, { id: cardId });

    const updateDest = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
    const reorderDest = db.transaction((items) => {
      items.forEach((item, idx) => updateDest.run(idx, item.id));
    });
    reorderDest(destCards);
  }

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
}

function createComment(cardId, content, authorName) {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
  ).run(id, cardId, content, authorName);
  return db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
}

function getBoardForExport(boardId) {
  const db = getDb();
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const rows = db.prepare(`
    SELECT
      bc.title AS column_title,
      c.content AS card_content,
      c.author_name AS card_author,
      c.created_at AS card_created_at,
      cm.content AS comment_content,
      cm.author_name AS comment_author,
      cm.created_at AS comment_created_at
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
  getBoardById,
  createColumn,
  createCard,
  moveCard,
  createComment,
  getBoardForExport,
};
