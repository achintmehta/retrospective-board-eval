import { randomUUID } from 'node:crypto';
import { run, get, all } from './db.js';

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

// ---------- Boards ----------
export async function createBoard(title) {
  const id = randomUUID();
  const now = Date.now();
  await run('INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)', [id, title, now]);
  for (let i = 0; i < DEFAULT_COLUMNS.length; i++) {
    await run(
      'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), id, DEFAULT_COLUMNS[i], i, now]
    );
  }
  return getBoardSummary(id);
}

export function getBoardSummary(id) {
  return get('SELECT id, title, created_at FROM boards WHERE id = ?', [id]);
}

export function listBoards() {
  return all('SELECT id, title, created_at FROM boards ORDER BY created_at DESC');
}

export async function getBoardFull(id) {
  const board = await getBoardSummary(id);
  if (!board) return null;
  const columns = await all(
    'SELECT id, board_id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC, created_at ASC',
    [id]
  );
  const columnIds = columns.map((c) => c.id);
  const cards = columnIds.length
    ? await all(
        `SELECT id, column_id, content, author_name, position, created_at
           FROM cards
          WHERE column_id IN (${columnIds.map(() => '?').join(',')})
          ORDER BY position ASC, created_at ASC`,
        columnIds
      )
    : [];
  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? await all(
        `SELECT id, card_id, content, author_name, created_at
           FROM comments
          WHERE card_id IN (${cardIds.map(() => '?').join(',')})
          ORDER BY created_at ASC`,
        cardIds
      )
    : [];
  return { ...board, columns, cards, comments };
}

// ---------- Columns ----------
export async function createColumn(boardId, title) {
  const board = await getBoardSummary(boardId);
  if (!board) return null;
  const row = await get(
    'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM board_columns WHERE board_id = ?',
    [boardId]
  );
  const id = randomUUID();
  const now = Date.now();
  await run(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, boardId, title, row.pos, now]
  );
  return get(
    'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?',
    [id]
  );
}

export function getColumn(id) {
  return get(
    'SELECT id, board_id, title, position, created_at FROM board_columns WHERE id = ?',
    [id]
  );
}

// ---------- Cards ----------
export async function createCard({ columnId, content, authorName }) {
  const col = await getColumn(columnId);
  if (!col) return null;
  const row = await get(
    'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM cards WHERE column_id = ?',
    [columnId]
  );
  const id = randomUUID();
  const now = Date.now();
  await run(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, columnId, content, authorName, row.pos, now]
  );
  const card = await get(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?',
    [id]
  );
  return { card, boardId: col.board_id };
}

export async function moveCard({ cardId, toColumnId, toPosition }) {
  const card = await get('SELECT * FROM cards WHERE id = ?', [cardId]);
  if (!card) return null;
  const destCol = await getColumn(toColumnId);
  if (!destCol) return null;

  const srcCol = await getColumn(card.column_id);
  const boardId = destCol.board_id;
  // Only allow moves within the same board
  if (!srcCol || srcCol.board_id !== boardId) return null;

  // Remove from source: shift positions down for cards after it
  await run(
    'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?',
    [card.column_id, card.position]
  );

  // Compute clamped destination position
  const countRow = await get(
    'SELECT COUNT(*) AS c FROM cards WHERE column_id = ?',
    [toColumnId]
  );
  const target = Math.max(0, Math.min(toPosition ?? countRow.c, countRow.c));

  // Make room in the destination
  await run(
    'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?',
    [toColumnId, target]
  );

  await run(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
    [toColumnId, target, cardId]
  );

  const updated = await get(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?',
    [cardId]
  );
  return {
    card: updated,
    boardId,
    fromColumnId: card.column_id,
    fromPosition: card.position,
    toColumnId,
    toPosition: target,
  };
}

// ---------- Comments ----------
export async function createComment({ cardId, content, authorName }) {
  const card = await get('SELECT column_id FROM cards WHERE id = ?', [cardId]);
  if (!card) return null;
  const col = await getColumn(card.column_id);
  const id = randomUUID();
  const now = Date.now();
  await run(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, cardId, content, authorName, now]
  );
  const comment = await get(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?',
    [id]
  );
  return { comment, boardId: col.board_id };
}
