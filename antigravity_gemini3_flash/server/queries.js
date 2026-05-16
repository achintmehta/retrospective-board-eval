const { db } = require('./db');
const { randomUUID } = require('crypto');

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const createBoard = async (title) => {
  const id = randomUUID();
  await run('INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
  const defaultColumns = ['Went Well', 'To Improve', 'Action Items'];
  for (let i = 0; i < defaultColumns.length; i++) {
    await createColumn(id, defaultColumns[i], i);
  }
  return id;
};

const getBoards = () => {
  return query('SELECT * FROM boards ORDER BY created_at DESC');
};

const getBoardWithDetails = async (boardId) => {
  const board = await get('SELECT * FROM boards WHERE id = ?', [boardId]);
  if (!board) return null;

  const columns = await query('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC', [boardId]);
  
  for (const col of columns) {
    col.cards = await query('SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC', [col.id]);
    for (const card of col.cards) {
      card.comments = await query('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC', [card.id]);
    }
  }

  return { ...board, columns };
};

const createColumn = async (boardId, title, position) => {
  const id = randomUUID();
  await run('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [id, boardId, title, position]);
  return id;
};

const createCard = async (columnId, content, authorName, position) => {
  const id = randomUUID();
  await run('INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)', [id, columnId, content, authorName, position]);
  return id;
};

const moveCard = async (cardId, newColumnId, newPosition) => {
  await run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [newColumnId, newPosition, cardId]);
};

const createComment = async (cardId, content, authorName) => {
  const id = randomUUID();
  await run('INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)', [id, cardId, content, authorName]);
  return id;
};

module.exports = {
  createBoard,
  getBoards,
  getBoardWithDetails,
  createColumn,
  createCard,
  moveCard,
  createComment
};
