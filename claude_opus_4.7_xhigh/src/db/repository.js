import { run, get, all } from './connection.js';

const DEFAULT_COLUMNS = [
  { title: 'Went Well', position: 0 },
  { title: 'Needs Improvement', position: 1 },
  { title: 'Action Items', position: 2 },
];

// ----- Boards -----

export async function createBoard(title) {
  const result = await run('INSERT INTO boards (title) VALUES (?)', [title]);
  const boardId = result.lastID;
  for (const col of DEFAULT_COLUMNS) {
    await run(
      'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)',
      [boardId, col.title, col.position]
    );
  }
  return getBoardSummary(boardId);
}

export function getBoardSummary(id) {
  return get('SELECT id, title, created_at FROM boards WHERE id = ?', [id]);
}

export function listBoards() {
  return all('SELECT id, title, created_at FROM boards ORDER BY created_at DESC');
}

export async function getBoardWithChildren(id) {
  const board = await getBoardSummary(id);
  if (!board) return null;

  const columns = await all(
    'SELECT id, title, position FROM board_columns WHERE board_id = ? ORDER BY position ASC, id ASC',
    [id]
  );
  if (columns.length === 0) return { ...board, columns: [] };

  const columnIds = columns.map((c) => c.id);
  const placeholders = columnIds.map(() => '?').join(',');
  const cards = await all(
    `SELECT id, column_id, content, author_name, position, created_at
       FROM cards
       WHERE column_id IN (${placeholders})
       ORDER BY position ASC, id ASC`,
    columnIds
  );

  const cardIds = cards.map((c) => c.id);
  let comments = [];
  if (cardIds.length > 0) {
    const cph = cardIds.map(() => '?').join(',');
    comments = await all(
      `SELECT id, card_id, content, author_name, created_at
         FROM comments
         WHERE card_id IN (${cph})
         ORDER BY created_at ASC, id ASC`,
      cardIds
    );
  }

  const cardsById = new Map();
  for (const card of cards) {
    cardsById.set(card.id, { ...card, comments: [] });
  }
  for (const comment of comments) {
    const card = cardsById.get(comment.card_id);
    if (card) card.comments.push(comment);
  }

  const cardsByColumn = new Map();
  for (const card of cardsById.values()) {
    if (!cardsByColumn.has(card.column_id)) cardsByColumn.set(card.column_id, []);
    cardsByColumn.get(card.column_id).push(card);
  }

  const columnsWithCards = columns.map((col) => ({
    ...col,
    cards: cardsByColumn.get(col.id) || [],
  }));

  return { ...board, columns: columnsWithCards };
}

// ----- Columns -----

export async function createColumn(boardId, title) {
  const row = await get(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM board_columns WHERE board_id = ?',
    [boardId]
  );
  const position = row?.next ?? 0;
  const result = await run(
    'INSERT INTO board_columns (board_id, title, position) VALUES (?, ?, ?)',
    [boardId, title, position]
  );
  return get(
    'SELECT id, board_id, title, position FROM board_columns WHERE id = ?',
    [result.lastID]
  );
}

export function getColumn(id) {
  return get('SELECT id, board_id, title, position FROM board_columns WHERE id = ?', [id]);
}

// ----- Cards -----

export async function createCard({ columnId, content, authorName }) {
  const row = await get(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE column_id = ?',
    [columnId]
  );
  const position = row?.next ?? 0;
  const result = await run(
    'INSERT INTO cards (column_id, content, author_name, position) VALUES (?, ?, ?, ?)',
    [columnId, content, authorName, position]
  );
  const card = await get(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?',
    [result.lastID]
  );
  return { ...card, comments: [] };
}

export function getCard(id) {
  return get(
    'SELECT id, column_id, content, author_name, position, created_at FROM cards WHERE id = ?',
    [id]
  );
}

// Move a card to another column (or reorder within the same column).
// `position` is the destination index inside `toColumnId`.
export async function moveCard({ cardId, toColumnId, position }) {
  const card = await getCard(cardId);
  if (!card) return null;

  const fromColumnId = card.column_id;
  const targetCol = await getColumn(toColumnId);
  if (!targetCol) return null;

  // Compact source column: shift cards above the moved card down by 1.
  await run(
    'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?',
    [fromColumnId, card.position]
  );

  // Make space at destination index.
  await run(
    'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?',
    [toColumnId, position]
  );

  await run(
    'UPDATE cards SET column_id = ?, position = ? WHERE id = ?',
    [toColumnId, position, cardId]
  );

  return getCard(cardId);
}

// ----- Comments -----

export async function createComment({ cardId, content, authorName }) {
  const result = await run(
    'INSERT INTO comments (card_id, content, author_name) VALUES (?, ?, ?)',
    [cardId, content, authorName]
  );
  return get(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE id = ?',
    [result.lastID]
  );
}

export function listCommentsForCard(cardId) {
  return all(
    'SELECT id, card_id, content, author_name, created_at FROM comments WHERE card_id = ? ORDER BY created_at ASC, id ASC',
    [cardId]
  );
}

// ----- Export support -----

export async function getBoardForExport(boardId) {
  return getBoardWithChildren(boardId);
}
