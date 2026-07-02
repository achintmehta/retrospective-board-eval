import { nanoid } from 'nanoid';
import db from './db.js';

const now = () => Date.now();
const id = () => nanoid(12);

const DEFAULT_COLUMNS = [
  { title: 'Went Well' },
  { title: 'Needs Improvement' },
  { title: 'Action Items' },
];

// ---------- Boards ----------
export function createBoard(title) {
  const boardId = id();
  const createdAt = now();
  const txn = db.transaction((title) => {
    db.prepare('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)').run(
      boardId,
      title,
      createdAt,
    );
    DEFAULT_COLUMNS.forEach((col, index) => {
      db.prepare(
        'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
      ).run(id(), boardId, col.title, (index + 1) * 1000, createdAt);
    });
  });
  txn(title);
  return getBoard(boardId);
}

export function listBoards() {
  const rows = db
    .prepare(
      `SELECT b.id, b.title, b.created_at,
              (SELECT COUNT(*) FROM cards c
                JOIN board_columns col ON col.id = c.column_id
                WHERE col.board_id = b.id) AS card_count,
              (SELECT COUNT(*) FROM board_columns col WHERE col.board_id = b.id) AS column_count
       FROM boards b
       ORDER BY b.created_at DESC`,
    )
    .all();
  return rows.map(mapBoardRow);
}

export function getBoard(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC',
    )
    .all(boardId);

  const cards = db
    .prepare(
      `SELECT c.id, c.column_id, c.content, c.author_name, c.position, c.created_at
       FROM cards c
       JOIN board_columns col ON col.id = c.column_id
       WHERE col.board_id = ?
       ORDER BY c.position ASC`,
    )
    .all(boardId);

  const comments = db
    .prepare(
      `SELECT cm.id, cm.card_id, cm.content, cm.author_name, cm.created_at
       FROM comments cm
       JOIN cards c ON c.id = cm.card_id
       JOIN board_columns col ON col.id = c.column_id
       WHERE col.board_id = ?
       ORDER BY cm.created_at ASC`,
    )
    .all(boardId);

  return {
    id: board.id,
    title: board.title,
    createdAt: board.created_at,
    columns: columns.map((col) => ({
      id: col.id,
      title: col.title,
      position: col.position,
      createdAt: col.created_at,
    })),
    cards: cards.map(mapCardRow),
    comments: comments.map(mapCommentRow),
  };
}

function mapBoardRow(row) {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    cardCount: row.card_count ?? 0,
    columnCount: row.column_count ?? 0,
  };
}

function mapCardRow(row) {
  return {
    id: row.id,
    columnId: row.column_id,
    content: row.content,
    authorName: row.author_name,
    position: row.position,
    createdAt: row.created_at,
  };
}

function mapCommentRow(row) {
  return {
    id: row.id,
    cardId: row.card_id,
    content: row.content,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

// ---------- Columns ----------
export function addColumn(boardId, title) {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;
  const maxPosRow = db
    .prepare('SELECT COALESCE(MAX(position), 0) AS mx FROM board_columns WHERE board_id = ?')
    .get(boardId);
  const position = (maxPosRow.mx ?? 0) + 1000;
  const columnId = id();
  const createdAt = now();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(columnId, boardId, title, position, createdAt);
  return { id: columnId, boardId, title, position, createdAt };
}

// ---------- Cards ----------
export function addCard({ columnId, content, authorName }) {
  const column = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!column) return null;
  const maxPosRow = db
    .prepare('SELECT COALESCE(MAX(position), 0) AS mx FROM cards WHERE column_id = ?')
    .get(columnId);
  const position = (maxPosRow.mx ?? 0) + 1000;
  const cardId = id();
  const createdAt = now();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(cardId, columnId, content, authorName, position, createdAt);
  return {
    boardId: column.board_id,
    card: {
      id: cardId,
      columnId,
      content,
      authorName,
      position,
      createdAt,
    },
  };
}

export function moveCard({ cardId, toColumnId, toIndex }) {
  const card = db
    .prepare(
      `SELECT c.id, c.column_id, col.board_id
       FROM cards c
       JOIN board_columns col ON col.id = c.column_id
       WHERE c.id = ?`,
    )
    .get(cardId);
  if (!card) return null;
  const targetColumn = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(toColumnId);
  if (!targetColumn || targetColumn.board_id !== card.board_id) return null;

  const siblings = db
    .prepare('SELECT id, position FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC')
    .all(toColumnId, cardId);
  const clampedIndex = Math.max(0, Math.min(toIndex ?? siblings.length, siblings.length));

  let newPosition;
  if (siblings.length === 0) {
    newPosition = 1000;
  } else if (clampedIndex === 0) {
    newPosition = siblings[0].position - 1000;
  } else if (clampedIndex >= siblings.length) {
    newPosition = siblings[siblings.length - 1].position + 1000;
  } else {
    const prev = siblings[clampedIndex - 1].position;
    const next = siblings[clampedIndex].position;
    newPosition = (prev + next) / 2;
  }

  db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
    toColumnId,
    newPosition,
    cardId,
  );

  // Rebalance if positions collide/drift too fine
  const conflictRow = db
    .prepare('SELECT COUNT(*) AS n FROM cards WHERE column_id = ? AND position = ?')
    .get(toColumnId, newPosition);
  if (conflictRow.n > 1) {
    const rows = db
      .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, created_at ASC')
      .all(toColumnId);
    const rebalance = db.transaction((rows) => {
      rows.forEach((r, i) => {
        db.prepare('UPDATE cards SET position = ? WHERE id = ?').run((i + 1) * 1000, r.id);
      });
    });
    rebalance(rows);
    const updated = db
      .prepare('SELECT position FROM cards WHERE id = ?')
      .get(cardId);
    newPosition = updated.position;
  }

  return {
    boardId: card.board_id,
    card: {
      id: cardId,
      fromColumnId: card.column_id,
      toColumnId,
      position: newPosition,
    },
  };
}

// ---------- Comments ----------
export function addComment({ cardId, content, authorName }) {
  const card = db
    .prepare(
      `SELECT c.id, col.board_id
       FROM cards c
       JOIN board_columns col ON col.id = c.column_id
       WHERE c.id = ?`,
    )
    .get(cardId);
  if (!card) return null;
  const commentId = id();
  const createdAt = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(commentId, cardId, content, authorName, createdAt);
  return {
    boardId: card.board_id,
    comment: {
      id: commentId,
      cardId,
      content,
      authorName,
      createdAt,
    },
  };
}

// ---------- Export ----------
export function exportBoardRows(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;
  const rows = db
    .prepare(
      `SELECT col.title AS column_title,
              col.position AS column_position,
              c.content AS card_content,
              c.author_name AS card_author,
              c.created_at AS card_created_at,
              cm.content AS comment_content,
              cm.author_name AS comment_author,
              cm.created_at AS comment_created_at
       FROM board_columns col
       LEFT JOIN cards c ON c.column_id = col.id
       LEFT JOIN comments cm ON cm.card_id = c.id
       WHERE col.board_id = ?
       ORDER BY col.position ASC, c.position ASC, cm.created_at ASC`,
    )
    .all(boardId);
  return { board, rows };
}
