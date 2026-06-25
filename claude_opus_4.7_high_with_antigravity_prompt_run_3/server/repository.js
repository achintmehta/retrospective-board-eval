import { db, transaction } from './db.js';
import { randomUUID } from 'node:crypto';

const now = () => Date.now();

const DEFAULT_COLUMNS = ['Went Well', 'To Improve', 'Action Items'];

export function createBoard(title) {
  const id = randomUUID();
  const created = now();
  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertCol = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const tx = transaction((boardTitle) => {
    insertBoard.run(id, boardTitle, created);
    DEFAULT_COLUMNS.forEach((colTitle, idx) => {
      insertCol.run(randomUUID(), id, colTitle, idx, created);
    });
  });
  tx(title);
  return getBoardSummary(id);
}

export function listBoards() {
  const boards = db
    .prepare('SELECT id, title, created_at FROM boards ORDER BY created_at DESC')
    .all();
  const countCards = db.prepare(`
    SELECT COUNT(c.id) AS card_count
    FROM cards c
    JOIN board_columns bc ON c.column_id = bc.id
    WHERE bc.board_id = ?
  `);
  return boards.map((b) => ({
    id: b.id,
    title: b.title,
    createdAt: b.created_at,
    cardCount: countCards.get(b.id).card_count,
  }));
}

export function getBoardSummary(boardId) {
  const board = db
    .prepare('SELECT id, title, created_at FROM boards WHERE id = ?')
    .get(boardId);
  if (!board) return null;
  return { id: board.id, title: board.title, createdAt: board.created_at };
}

export function getBoard(boardId) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const columns = db
    .prepare(
      'SELECT id, title, position, created_at FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(boardId);
  const colIds = columns.map((c) => c.id);
  const cards = colIds.length
    ? db
        .prepare(
          `SELECT id, column_id, content, author_name, position, created_at
           FROM cards WHERE column_id IN (${colIds.map(() => '?').join(',')})
           ORDER BY position ASC`
        )
        .all(...colIds)
    : [];
  const cardIds = cards.map((c) => c.id);
  const comments = cardIds.length
    ? db
        .prepare(
          `SELECT id, card_id, content, author_name, created_at
           FROM comments WHERE card_id IN (${cardIds.map(() => '?').join(',')})
           ORDER BY created_at ASC`
        )
        .all(...cardIds)
    : [];

  return {
    id: board.id,
    title: board.title,
    createdAt: board.createdAt,
    columns: columns.map((col) => ({
      id: col.id,
      title: col.title,
      position: col.position,
      createdAt: col.created_at,
      cards: cards
        .filter((c) => c.column_id === col.id)
        .map((c) => ({
          id: c.id,
          columnId: c.column_id,
          content: c.content,
          authorName: c.author_name,
          position: c.position,
          createdAt: c.created_at,
          comments: comments
            .filter((cm) => cm.card_id === c.id)
            .map((cm) => ({
              id: cm.id,
              cardId: cm.card_id,
              content: cm.content,
              authorName: cm.author_name,
              createdAt: cm.created_at,
            })),
        })),
    })),
  };
}

export function addColumn(boardId, title) {
  const board = getBoardSummary(boardId);
  if (!board) return null;
  const id = randomUUID();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM board_columns WHERE board_id = ?')
    .get(boardId).m;
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, boardId, title, maxPos + 1, now());
  return {
    id,
    boardId,
    title,
    position: maxPos + 1,
    cards: [],
  };
}

export function addCard({ columnId, content, authorName }) {
  const col = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!col) return null;
  const id = randomUUID();
  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS m FROM cards WHERE column_id = ?')
    .get(columnId).m;
  const created = now();
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, maxPos + 1, created);
  return {
    boardId: col.board_id,
    card: {
      id,
      columnId,
      content,
      authorName,
      position: maxPos + 1,
      createdAt: created,
      comments: [],
    },
  };
}

export function moveCard({ cardId, toColumnId, toPosition }) {
  const card = db
    .prepare(
      `SELECT c.id, c.column_id, bc.board_id
       FROM cards c JOIN board_columns bc ON c.column_id = bc.id
       WHERE c.id = ?`
    )
    .get(cardId);
  if (!card) return null;
  const targetCol = db
    .prepare('SELECT id, board_id FROM board_columns WHERE id = ?')
    .get(toColumnId);
  if (!targetCol || targetCol.board_id !== card.board_id) return null;

  const tx = transaction(() => {
    const fromCol = card.column_id;
    const movingSameCol = fromCol === toColumnId;

    if (movingSameCol) {
      const cards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(toColumnId)
        .map((r) => r.id)
        .filter((id) => id !== cardId);
      const insertAt = Math.max(0, Math.min(toPosition, cards.length));
      cards.splice(insertAt, 0, cardId);
      const upd = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      cards.forEach((id, idx) => upd.run(idx, id));
      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(toColumnId, cardId);
    } else {
      const sourceCards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(fromCol)
        .map((r) => r.id)
        .filter((id) => id !== cardId);
      const targetCards = db
        .prepare('SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC')
        .all(toColumnId)
        .map((r) => r.id);
      const insertAt = Math.max(0, Math.min(toPosition, targetCards.length));
      targetCards.splice(insertAt, 0, cardId);

      db.prepare('UPDATE cards SET column_id = ? WHERE id = ?').run(toColumnId, cardId);
      const upd = db.prepare('UPDATE cards SET position = ? WHERE id = ?');
      sourceCards.forEach((id, idx) => upd.run(idx, id));
      targetCards.forEach((id, idx) => upd.run(idx, id));
    }
  });
  tx();

  return {
    boardId: card.board_id,
    cardId,
    fromColumnId: card.column_id,
    toColumnId,
    toPosition,
  };
}

export function addComment({ cardId, content, authorName }) {
  const card = db
    .prepare(
      `SELECT c.id, bc.board_id
       FROM cards c JOIN board_columns bc ON c.column_id = bc.id
       WHERE c.id = ?`
    )
    .get(cardId);
  if (!card) return null;
  const id = randomUUID();
  const created = now();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, content, authorName, created);
  return {
    boardId: card.board_id,
    comment: { id, cardId, content, authorName, createdAt: created },
  };
}

export function exportBoardCsv(boardId) {
  const board = getBoard(boardId);
  if (!board) return null;
  const escape = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = [
    [
      'column',
      'card_id',
      'card_content',
      'card_author',
      'card_created_at',
      'comment_id',
      'comment_content',
      'comment_author',
      'comment_created_at',
    ].join(','),
  ];
  for (const col of board.columns) {
    if (col.cards.length === 0) {
      rows.push([escape(col.title), '', '', '', '', '', '', '', ''].join(','));
      continue;
    }
    for (const card of col.cards) {
      const cardCreated = new Date(card.createdAt).toISOString();
      if (card.comments.length === 0) {
        rows.push(
          [
            escape(col.title),
            escape(card.id),
            escape(card.content),
            escape(card.authorName),
            escape(cardCreated),
            '',
            '',
            '',
            '',
          ].join(',')
        );
      } else {
        for (const cm of card.comments) {
          rows.push(
            [
              escape(col.title),
              escape(card.id),
              escape(card.content),
              escape(card.authorName),
              escape(cardCreated),
              escape(cm.id),
              escape(cm.content),
              escape(cm.authorName),
              escape(new Date(cm.createdAt).toISOString()),
            ].join(',')
          );
        }
      }
    }
  }
  return { title: board.title, csv: rows.join('\n') };
}
