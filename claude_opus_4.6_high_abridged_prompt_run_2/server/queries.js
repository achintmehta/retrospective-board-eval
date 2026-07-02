import crypto from 'crypto';
import { persist } from './db.js';

function uid() {
  return crypto.randomUUID();
}

function all(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(db, sql, params = []) {
  const rows = all(db, sql, params);
  return rows[0] || null;
}

function run(db, sql, params = []) {
  db.run(sql, params);
  persist();
}

// Boards
export function createBoard(db, title) {
  const id = uid();
  run(db, 'INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
  return get(db, 'SELECT * FROM boards WHERE id = ?', [id]);
}

export function getAllBoards(db) {
  return all(db, 'SELECT * FROM boards ORDER BY created_at DESC');
}

export function getBoardById(db, id) {
  return get(db, 'SELECT * FROM boards WHERE id = ?', [id]);
}

export function getBoardFull(db, boardId) {
  const board = getBoardById(db, boardId);
  if (!board) return null;

  const columns = all(db, 'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position', [boardId]);

  for (const col of columns) {
    col.cards = all(db, 'SELECT * FROM cards WHERE column_id = ? ORDER BY position', [col.id]);
    for (const card of col.cards) {
      card.comments = all(db, 'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at', [card.id]);
    }
  }

  board.columns = columns;
  return board;
}

// Columns
export function createColumn(db, boardId, title) {
  const id = uid();
  const maxPos = get(db, 'SELECT COALESCE(MAX(position), -1) as max_pos FROM board_columns WHERE board_id = ?', [boardId]);
  const position = (maxPos?.max_pos ?? -1) + 1;
  run(db, 'INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [id, boardId, title, position]);
  const col = get(db, 'SELECT * FROM board_columns WHERE id = ?', [id]);
  col.cards = [];
  return col;
}

// Cards
export function createCard(db, columnId, content, authorName) {
  const id = uid();
  const maxPos = get(db, 'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?', [columnId]);
  const position = (maxPos?.max_pos ?? -1) + 1;
  run(db, 'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)', [id, columnId, content, authorName, position]);
  const card = get(db, 'SELECT * FROM cards WHERE id = ?', [id]);
  card.comments = [];
  return card;
}

export function moveCard(db, cardId, targetColumnId, position) {
  run(db, 'UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [targetColumnId, position, cardId]);
  return get(db, 'SELECT * FROM cards WHERE id = ?', [cardId]);
}

// Comments
export function createComment(db, cardId, content, authorName) {
  const id = uid();
  run(db, 'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)', [id, cardId, content, authorName]);
  return get(db, 'SELECT * FROM comments WHERE id = ?', [id]);
}
