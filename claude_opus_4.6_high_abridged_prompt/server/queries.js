import { v4 as uuidv4 } from 'uuid';
import { persist } from './db.js';

function toObjects(stmt) {
  const cols = stmt.getColumnNames();
  const rows = [];
  while (stmt.step()) {
    const values = stmt.get();
    const row = {};
    cols.forEach((col, i) => { row[col] = values[i]; });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

export function createBoard(db, title) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)', [id, title, now]);
  persist();
  return { id, title, created_at: now };
}

export function getAllBoards(db) {
  const stmt = db.prepare('SELECT * FROM boards ORDER BY created_at DESC');
  return toObjects(stmt);
}

export function getBoardById(db, id) {
  const stmt = db.prepare('SELECT * FROM boards WHERE id = ?');
  stmt.bind([id]);
  const rows = toObjects(stmt);
  if (rows.length === 0) return null;

  const board = rows[0];
  board.columns = getColumnsByBoardId(db, id);

  for (const col of board.columns) {
    col.cards = getCardsByColumnId(db, col.id);
    for (const card of col.cards) {
      card.comments = getCommentsByCardId(db, card.id);
    }
  }

  return board;
}

export function createColumn(db, boardId, title) {
  const id = uuidv4();
  const stmt = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM board_columns WHERE board_id = ?');
  stmt.bind([boardId]);
  const rows = toObjects(stmt);
  const position = rows[0].next_pos;

  db.run('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [id, boardId, title, position]);
  persist();
  return { id, board_id: boardId, title, position };
}

export function getColumnsByBoardId(db, boardId) {
  const stmt = db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC');
  stmt.bind([boardId]);
  return toObjects(stmt);
}

export function createCard(db, columnId, content, authorName) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const stmt = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM cards WHERE column_id = ?');
  stmt.bind([columnId]);
  const rows = toObjects(stmt);
  const position = rows[0].next_pos;

  db.run('INSERT INTO cards (id, column_id, content, author_name, created_at, position) VALUES (?, ?, ?, ?, ?, ?)',
    [id, columnId, content, authorName, now, position]);
  persist();
  return { id, column_id: columnId, content, author_name: authorName, created_at: now, position };
}

export function moveCard(db, cardId, newColumnId, newPosition) {
  db.run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [newColumnId, newPosition, cardId]);
  persist();
  return { id: cardId, column_id: newColumnId, position: newPosition };
}

export function getCardsByColumnId(db, columnId) {
  const stmt = db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC');
  stmt.bind([columnId]);
  return toObjects(stmt);
}

export function createComment(db, cardId, content, authorName) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run('INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, cardId, content, authorName, now]);
  persist();
  return { id, card_id: cardId, content, author_name: authorName, created_at: now };
}

export function getCommentsByCardId(db, cardId) {
  const stmt = db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC');
  stmt.bind([cardId]);
  return toObjects(stmt);
}

export function getBoardExportData(db, boardId) {
  const board = getBoardById(db, boardId);
  if (!board) return null;

  const rows = [];
  for (const col of board.columns) {
    for (const card of col.cards) {
      const comments = card.comments.map(c => `${c.author_name}: ${c.content}`).join(' | ');
      rows.push({
        board_title: board.title,
        column: col.title,
        card_content: card.content,
        card_author: card.author_name,
        card_created: card.created_at,
        comments,
      });
    }
  }
  return { title: board.title, rows };
}
