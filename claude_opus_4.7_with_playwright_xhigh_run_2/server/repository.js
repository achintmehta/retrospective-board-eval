const crypto = require('crypto');
const db = require('./db');

const newId = () => crypto.randomUUID();

const DEFAULT_COLUMNS = [
  'Went Well',
  'Needs Improvement',
  'Action Items',
];

const stmt = {
  insertBoard: db.prepare(
    'INSERT INTO boards (id, title) VALUES (?, ?)'
  ),
  selectBoardById: db.prepare(
    'SELECT id, title, created_at FROM boards WHERE id = ?'
  ),
  selectAllBoards: db.prepare(
    'SELECT id, title, created_at FROM boards ORDER BY datetime(created_at) DESC'
  ),
  insertColumn: db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ),
  maxColumnPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?'
  ),
  selectColumnsForBoard: db.prepare(
    'SELECT id, board_id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC, datetime(created_at) ASC'
  ),
  selectColumnById: db.prepare(
    'SELECT id, board_id, title, position FROM board_columns WHERE id = ?'
  ),
  insertCard: db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
  ),
  maxCardPosition: db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?'
  ),
  selectCardsForBoard: db.prepare(`
    SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
    FROM cards c
    INNER JOIN board_columns bc ON bc.id = c.column_id
    WHERE bc.board_id = ?
    ORDER BY c.position ASC, datetime(c.created_at) ASC
  `),
  selectCardById: db.prepare(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
  ),
  updateCardColumnAndPosition: db.prepare(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
  ),
  updateCardPosition: db.prepare(
    'UPDATE cards SET position = ? WHERE id = ?'
  ),
  cardsInColumnOrdered: db.prepare(
    'SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, datetime(created_at) ASC'
  ),
  insertComment: db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
  ),
  selectCommentsForBoard: db.prepare(`
    SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
    FROM comments cm
    INNER JOIN cards c ON c.id = cm.card_id
    INNER JOIN board_columns bc ON bc.id = c.column_id
    WHERE bc.board_id = ?
    ORDER BY datetime(cm.created_at) ASC
  `),
  selectCommentsForCard: db.prepare(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY datetime(created_at) ASC'
  ),
  selectBoardIdForColumn: db.prepare(
    'SELECT board_id FROM board_columns WHERE id = ?'
  ),
  selectBoardIdForCard: db.prepare(`
    SELECT bc.board_id AS board_id
    FROM cards c
    INNER JOIN board_columns bc ON bc.id = c.column_id
    WHERE c.id = ?
  `),
};

function createBoard({ title, columns }) {
  const safeTitle = String(title || '').trim();
  if (!safeTitle) {
    throw new Error('Board title is required');
  }
  const columnTitles = (Array.isArray(columns) && columns.length > 0
    ? columns
    : DEFAULT_COLUMNS
  )
    .map((c) => String(c || '').trim())
    .filter(Boolean);

  const id = newId();
  const tx = db.transaction(() => {
    stmt.insertBoard.run(id, safeTitle);
    columnTitles.forEach((title, idx) => {
      stmt.insertColumn.run(newId(), id, title, idx);
    });
  });
  tx();
  return getBoardById(id);
}

function listBoards() {
  return stmt.selectAllBoards.all();
}

function getBoardById(id) {
  const board = stmt.selectBoardById.get(id);
  if (!board) return null;
  const columns = stmt.selectColumnsForBoard.all(id);
  const cards = stmt.selectCardsForBoard.all(id);
  const comments = stmt.selectCommentsForBoard.all(id);
  return { ...board, columns, cards, comments };
}

function addColumn({ boardId, title }) {
  const safeTitle = String(title || '').trim();
  if (!safeTitle) {
    throw new Error('Column title is required');
  }
  const board = stmt.selectBoardById.get(boardId);
  if (!board) {
    throw new Error('Board not found');
  }
  const id = newId();
  const position = stmt.maxColumnPosition.get(boardId).max + 1;
  stmt.insertColumn.run(id, boardId, safeTitle, position);
  return stmt.selectColumnById.get(id);
}

function addCard({ columnId, content, authorName }) {
  const safeContent = String(content || '').trim();
  const safeAuthor = String(authorName || '').trim() || 'Anonymous';
  if (!safeContent) {
    throw new Error('Card content is required');
  }
  const column = stmt.selectColumnById.get(columnId);
  if (!column) {
    throw new Error('Column not found');
  }
  const id = newId();
  const position = stmt.maxCardPosition.get(columnId).max + 1;
  stmt.insertCard.run(id, columnId, safeContent, safeAuthor, position);
  return {
    card: stmt.selectCardById.get(id),
    boardId: column.board_id,
  };
}

function moveCard({ cardId, toColumnId, newIndex }) {
  const card = stmt.selectCardById.get(cardId);
  if (!card) {
    throw new Error('Card not found');
  }
  const toColumn = stmt.selectColumnById.get(toColumnId);
  if (!toColumn) {
    throw new Error('Target column not found');
  }
  const fromColumnId = card.column_id;
  const tx = db.transaction(() => {
    // Move card into the new column at the end first, so the row's column_id is updated.
    const tempPosition = stmt.maxCardPosition.get(toColumnId).max + 1;
    stmt.updateCardColumnAndPosition.run(toColumnId, tempPosition, cardId);

    if (fromColumnId !== toColumnId) {
      // Re-sequence the source column.
      const sourceIds = stmt.cardsInColumnOrdered.all(fromColumnId).map((r) => r.id);
      sourceIds.forEach((id, i) => stmt.updateCardPosition.run(i, id));
    }

    // Re-sequence the destination column, inserting the moved card at newIndex.
    const destIds = stmt.cardsInColumnOrdered.all(toColumnId).map((r) => r.id);
    const filtered = destIds.filter((id) => id !== cardId);
    const insertAt = Math.min(Math.max(Number.isFinite(newIndex) ? newIndex : filtered.length, 0), filtered.length);
    filtered.splice(insertAt, 0, cardId);
    filtered.forEach((id, i) => stmt.updateCardPosition.run(i, id));
  });
  tx();
  return {
    card: stmt.selectCardById.get(cardId),
    fromColumnId,
    toColumnId,
    boardId: toColumn.board_id,
  };
}

function addComment({ cardId, content, authorName }) {
  const safeContent = String(content || '').trim();
  const safeAuthor = String(authorName || '').trim() || 'Anonymous';
  if (!safeContent) {
    throw new Error('Comment content is required');
  }
  const card = stmt.selectCardById.get(cardId);
  if (!card) {
    throw new Error('Card not found');
  }
  const id = newId();
  stmt.insertComment.run(id, cardId, safeContent, safeAuthor);
  const boardRow = stmt.selectBoardIdForCard.get(cardId);
  return {
    comment: { id, card_id: cardId, content: safeContent, author_name: safeAuthor, created_at: new Date().toISOString() },
    boardId: boardRow ? boardRow.board_id : null,
  };
}

function getCommentsForCard(cardId) {
  return stmt.selectCommentsForCard.all(cardId);
}

function getBoardExportRows(boardId) {
  const board = getBoardById(boardId);
  if (!board) return null;
  const columnById = new Map(board.columns.map((c) => [c.id, c]));
  const commentsByCard = new Map();
  for (const comment of board.comments) {
    if (!commentsByCard.has(comment.card_id)) {
      commentsByCard.set(comment.card_id, []);
    }
    commentsByCard.get(comment.card_id).push(comment);
  }
  const rows = [];
  for (const card of board.cards) {
    const column = columnById.get(card.column_id);
    const comments = commentsByCard.get(card.id) || [];
    if (comments.length === 0) {
      rows.push({
        column: column ? column.title : '',
        card: card.content,
        cardAuthor: card.author_name,
        cardCreatedAt: card.created_at,
        comment: '',
        commentAuthor: '',
        commentCreatedAt: '',
      });
    } else {
      for (const comment of comments) {
        rows.push({
          column: column ? column.title : '',
          card: card.content,
          cardAuthor: card.author_name,
          cardCreatedAt: card.created_at,
          comment: comment.content,
          commentAuthor: comment.author_name,
          commentCreatedAt: comment.created_at,
        });
      }
    }
  }
  return { board, rows };
}

module.exports = {
  createBoard,
  listBoards,
  getBoardById,
  addColumn,
  addCard,
  moveCard,
  addComment,
  getCommentsForCard,
  getBoardExportRows,
};
