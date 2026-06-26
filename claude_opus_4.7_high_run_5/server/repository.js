const crypto = require('crypto');
const { db, transaction } = require('./db');

const newId = () => crypto.randomUUID();
const now = () => Date.now();

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

// ---------- Boards ----------

function createBoard(title) {
  const id = newId();
  const createdAt = now();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );

  transaction(() => {
    insertBoard.run(id, title, createdAt);
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      insertColumn.run(newId(), id, colTitle, idx);
    });
  });

  return getBoard(id);
}

function listBoards() {
  return db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
}

function getBoard(id) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(id);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(id);

  const cardStmt = db.prepare(
    'SELECT id, column_id, content, author_name, created_at, position FROM cards WHERE column_id = ? ORDER BY position ASC'
  );
  const commentStmt = db.prepare(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC'
  );

  for (const col of columns) {
    const cards = cardStmt.all(col.id);
    for (const card of cards) {
      card.comments = commentStmt.all(card.id);
    }
    col.cards = cards;
  }

  board.columns = columns;
  return board;
}

// ---------- Columns ----------

function addColumn(boardId, title) {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const { maxPos } = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS maxPos FROM board_columns WHERE board_id = ?'
    )
    .get(boardId);

  const id = newId();
  const position = maxPos + 1;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, position);

  return { id, board_id: boardId, title, position, cards: [] };
}

function getColumnBoardId(columnId) {
  const row = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  return row ? row.board_id : null;
}

// ---------- Cards ----------

function addCard({ columnId, content, authorName }) {
  const boardId = getColumnBoardId(columnId);
  if (!boardId) return null;

  const { maxPos } = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS maxPos FROM cards WHERE column_id = ?'
    )
    .get(columnId);

  const card = {
    id: newId(),
    column_id: columnId,
    content,
    author_name: authorName,
    created_at: now(),
    position: maxPos + 1,
  };

  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, created_at, position) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    card.id,
    card.column_id,
    card.content,
    card.author_name,
    card.created_at,
    card.position
  );

  return { card, boardId };
}

function moveCard({ cardId, toColumnId, newPosition }) {
  const card = db
    .prepare('SELECT id, column_id FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) return null;

  const boardId = getColumnBoardId(toColumnId);
  if (!boardId) return null;
  const sourceBoardId = getColumnBoardId(card.column_id);
  if (sourceBoardId !== boardId) return null;

  const fromColumnId = card.column_id;
  const targetPos = Math.max(0, Math.floor(newPosition));

  transaction(() => {
    if (fromColumnId === toColumnId) {
      // Same column: clear current position, re-insert at target
      const currentPos = db
        .prepare('SELECT position FROM cards WHERE id = ?')
        .get(cardId).position;

      if (targetPos === currentPos) return;

      if (targetPos < currentPos) {
        db.prepare(
          `UPDATE cards SET position = position + 1
           WHERE column_id = ? AND position >= ? AND position < ? AND id != ?`
        ).run(toColumnId, targetPos, currentPos, cardId);
      } else {
        db.prepare(
          `UPDATE cards SET position = position - 1
           WHERE column_id = ? AND position > ? AND position <= ? AND id != ?`
        ).run(toColumnId, currentPos, targetPos, cardId);
      }
      db.prepare('UPDATE cards SET position = ? WHERE id = ?').run(
        targetPos,
        cardId
      );
    } else {
      // Different column: close gap in source, open gap in destination
      const currentPos = db
        .prepare('SELECT position FROM cards WHERE id = ?')
        .get(cardId).position;

      db.prepare(
        'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?'
      ).run(fromColumnId, currentPos);

      db.prepare(
        'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
      ).run(toColumnId, targetPos);

      db.prepare(
        'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
      ).run(toColumnId, targetPos, cardId);
    }
  });

  return {
    cardId,
    fromColumnId,
    toColumnId,
    newPosition: targetPos,
    boardId,
  };
}

// ---------- Comments ----------

function addComment({ cardId, content, authorName }) {
  const card = db
    .prepare('SELECT id, column_id FROM cards WHERE id = ?')
    .get(cardId);
  if (!card) return null;

  const boardId = getColumnBoardId(card.column_id);
  const comment = {
    id: newId(),
    card_id: cardId,
    content,
    author_name: authorName,
    created_at: now(),
  };

  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(
    comment.id,
    comment.card_id,
    comment.content,
    comment.author_name,
    comment.created_at
  );

  return { comment, boardId };
}

// ---------- Export ----------

function getBoardForExport(boardId) {
  return getBoard(boardId);
}

module.exports = {
  createBoard,
  listBoards,
  getBoard,
  addColumn,
  addCard,
  moveCard,
  addComment,
  getColumnBoardId,
  getBoardForExport,
};
