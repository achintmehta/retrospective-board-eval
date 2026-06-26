import { randomUUID } from 'node:crypto';
import { db, withTransaction } from './db.js';

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

// ---------- Boards ----------

export function createBoard(title) {
  const id = randomUUID();
  const insertBoard = db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)');
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  );
  withTransaction(() => {
    insertBoard.run(id, title);
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      insertColumn.run(randomUUID(), id, colTitle, idx);
    });
  });
  return getBoardSummary(id);
}

export function listBoards() {
  return db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM cards c
                 JOIN board_columns bc ON bc.id = c.column_id
                WHERE bc.board_id = b.id) AS card_count
         FROM boards b
        ORDER BY datetime(b.created_at) DESC`
    )
    .all();
}

export function getBoardSummary(boardId) {
  return db.prepare('SELECT id, title, created_at FROM boards WHERE id = ?').get(boardId);
}

export function getFullBoard(boardId) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const columns = db
    .prepare('SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position')
    .all(boardId);
  const cards = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
         FROM cards c
         JOIN board_columns bc ON bc.id = c.column_id
        WHERE bc.board_id = ?
        ORDER BY c.position`
    )
    .all(boardId);
  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db
        .prepare(
          `SELECT id, card_id, content, author_name, created_at
             FROM comments
            WHERE card_id IN (${cardIds.map(() => '?').join(',')})
            ORDER BY datetime(created_at)`
        )
        .all(...cardIds)
    : [];
  const commentsByCard = new Map();
  for (const cm of comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  }
  const cardsWithComments = cards.map((c) => ({
    ...c,
    comments: commentsByCard.get(c.id) || [],
  }));
  const columnsWithCards = columns.map((col) => ({
    ...col,
    cards: cardsWithComments.filter((c) => c.column_id === col.id),
  }));
  return { ...board, columns: columnsWithCards };
}

// ---------- Columns ----------

export function createColumn(boardId, title) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const id = randomUUID();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM board_columns WHERE board_id = ?')
    .get(boardId).m;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)'
  ).run(id, boardId, title, maxPos + 1);
  return { id, board_id: boardId, title, position: maxPos + 1 };
}

export function getColumn(columnId) {
  return db
    .prepare('SELECT id, board_id, title, position FROM board_columns WHERE id = ?')
    .get(columnId);
}

// ---------- Cards ----------

export function createCard(columnId, content, authorName) {
  const col = getColumn(columnId);
  if (!col) return null;
  const id = randomUUID();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM cards WHERE column_id = ?')
    .get(columnId).m;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, maxPos + 1);
  const card = db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(id);
  return { card, boardId: col.board_id };
}

export function moveCard(cardId, toColumnId, toPosition) {
  const card = db.prepare('SELECT id, column_id FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;
  const targetCol = getColumn(toColumnId);
  if (!targetCol) return null;

  withTransaction(() => {
    // remove from old column
    db.prepare(
      `UPDATE cards SET position = position - 1
        WHERE column_id = ?
          AND position > (SELECT position FROM cards WHERE id = ?)`
    ).run(card.column_id, cardId);

    // make space in new column
    db.prepare(
      `UPDATE cards SET position = position + 1
        WHERE column_id = ? AND position >= ?`
    ).run(toColumnId, toPosition);

    db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
      toColumnId,
      toPosition,
      cardId
    );
  });

  const moved = db
    .prepare(
      'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?'
    )
    .get(cardId);
  return { card: moved, boardId: targetCol.board_id, fromColumnId: card.column_id };
}

export function getCard(cardId) {
  return db
    .prepare('SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?')
    .get(cardId);
}

// ---------- Comments ----------

export function createComment(cardId, content, authorName) {
  const card = getCard(cardId);
  if (!card) return null;
  const col = getColumn(card.column_id);
  const id = randomUUID();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
  ).run(id, cardId, content, authorName);
  const comment = db
    .prepare('SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?')
    .get(id);
  return { comment, boardId: col.board_id };
}
