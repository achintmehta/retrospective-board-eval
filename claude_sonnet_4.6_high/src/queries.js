const { run, get, all } = require('./db');
const { v4: uuidv4 } = require('uuid');

async function createBoard(title) {
  const id = uuidv4();
  await run('INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
  return get('SELECT * FROM boards WHERE id = ?', [id]);
}

async function getAllBoards() {
  return all('SELECT * FROM boards ORDER BY created_at DESC');
}

async function getBoardById(boardId) {
  const board = await get('SELECT * FROM boards WHERE id = ?', [boardId]);
  if (!board) return null;

  const columns = await all(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC',
    [boardId]
  );

  for (const col of columns) {
    const cards = await all(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC',
      [col.id]
    );
    for (const card of cards) {
      card.comments = await all(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC',
        [card.id]
      );
    }
    col.cards = cards;
  }

  board.columns = columns;
  return board;
}

async function createColumn(boardId, title) {
  const id = uuidv4();
  const maxPos = await get(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM board_columns WHERE board_id = ?',
    [boardId]
  );
  const position = maxPos.maxPos + 1;
  await run(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)',
    [id, boardId, title, position]
  );
  return get('SELECT * FROM board_columns WHERE id = ?', [id]);
}

async function createCard(columnId, content, authorName) {
  const id = uuidv4();
  const maxPos = await get(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM cards WHERE column_id = ?',
    [columnId]
  );
  const position = maxPos.maxPos + 1;
  await run(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)',
    [id, columnId, content, authorName, position]
  );
  return get('SELECT * FROM cards WHERE id = ?', [id]);
}

async function moveCard(cardId, newColumnId, newPosition) {
  await run(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
    [newColumnId, newPosition, cardId]
  );
  return get('SELECT * FROM cards WHERE id = ?', [cardId]);
}

async function createComment(cardId, content, authorName) {
  const id = uuidv4();
  await run(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)',
    [id, cardId, content, authorName]
  );
  return get('SELECT * FROM comments WHERE id = ?', [id]);
}

async function getBoardForExport(boardId) {
  const columns = await all(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC',
    [boardId]
  );
  const result = [];
  for (const col of columns) {
    const cards = await all(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC',
      [col.id]
    );
    for (const card of cards) {
      const comments = await all(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC',
        [card.id]
      );
      result.push({ column: col, card, comments });
    }
  }
  return result;
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
