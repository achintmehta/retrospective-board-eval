import { nanoid } from 'nanoid';
import db from './index.js';
import type {
  BoardRow,
  BoardColumnRow,
  BoardWithChildren,
  CardRow,
  CommentRow,
} from './types.js';

const DEFAULT_COLUMNS = ['Went Well', 'Needs Improvement', 'Action Items'];

// ---------- Boards ----------------------------------------------------------

export function createBoard(title: string): BoardRow {
  const id = nanoid(10);
  const createdAt = Date.now();
  const cleanTitle = title.trim() || 'Untitled Retro';

  const insertBoard = db.prepare(
    'INSERT INTO boards (id, title, created_at) VALUES (?, ?, ?)'
  );
  const insertColumn = db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    insertBoard.run(id, cleanTitle, createdAt);
    DEFAULT_COLUMNS.forEach((columnTitle, index) => {
      insertColumn.run(nanoid(10), id, columnTitle, index, createdAt);
    });
  });
  tx();

  return { id, title: cleanTitle, created_at: createdAt };
}

export function listBoards(): BoardRow[] {
  return db
    .prepare('SELECT * FROM boards ORDER BY created_at DESC')
    .all() as BoardRow[];
}

export function getBoard(boardId: string): BoardWithChildren | null {
  const board = db
    .prepare('SELECT * FROM boards WHERE id = ?')
    .get(boardId) as BoardRow | undefined;
  if (!board) return null;

  const columns = db
    .prepare(
      'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC'
    )
    .all(boardId) as BoardColumnRow[];

  const columnIds = columns.map((c) => c.id);
  const cards: CardRow[] = columnIds.length
    ? (db
        .prepare(
          `SELECT * FROM cards WHERE column_id IN (${columnIds.map(() => '?').join(',')}) ORDER BY position ASC`
        )
        .all(...columnIds) as CardRow[])
    : [];

  const cardIds = cards.map((c) => c.id);
  const comments: CommentRow[] = cardIds.length
    ? (db
        .prepare(
          `SELECT * FROM comments WHERE card_id IN (${cardIds.map(() => '?').join(',')}) ORDER BY created_at ASC`
        )
        .all(...cardIds) as CommentRow[])
    : [];

  const commentsByCard = new Map<string, CommentRow[]>();
  for (const c of comments) {
    const arr = commentsByCard.get(c.card_id) ?? [];
    arr.push(c);
    commentsByCard.set(c.card_id, arr);
  }

  const cardsByColumn = new Map<string, CardRow[]>();
  for (const card of cards) {
    const arr = cardsByColumn.get(card.column_id) ?? [];
    arr.push(card);
    cardsByColumn.set(card.column_id, arr);
  }

  return {
    ...board,
    columns: columns.map((col) => ({
      ...col,
      cards: (cardsByColumn.get(col.id) ?? []).map((card) => ({
        ...card,
        comments: commentsByCard.get(card.id) ?? [],
      })),
    })),
  };
}

// ---------- Columns ---------------------------------------------------------

export function createColumn(
  boardId: string,
  title: string
): BoardColumnRow | null {
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return null;

  const maxPosition = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS maxp FROM board_columns WHERE board_id = ?'
    )
    .get(boardId) as { maxp: number };

  const id = nanoid(10);
  const createdAt = Date.now();
  db.prepare(
    'INSERT INTO board_columns (id, board_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, boardId, title.trim() || 'Untitled Column', maxPosition.maxp + 1, createdAt);

  return {
    id,
    board_id: boardId,
    title: title.trim() || 'Untitled Column',
    position: maxPosition.maxp + 1,
    created_at: createdAt,
  };
}

// ---------- Cards -----------------------------------------------------------

export function createCard(
  columnId: string,
  content: string,
  authorName: string
): CardRow | null {
  const column = db
    .prepare('SELECT id FROM board_columns WHERE id = ?')
    .get(columnId);
  if (!column) return null;

  const clean = content.trim();
  if (!clean) return null;

  const maxPosition = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS maxp FROM cards WHERE column_id = ?'
    )
    .get(columnId) as { maxp: number };

  const id = nanoid(10);
  const createdAt = Date.now();
  const authorClean = authorName.trim() || 'Guest';

  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, columnId, clean, authorClean, maxPosition.maxp + 1, createdAt);

  return {
    id,
    column_id: columnId,
    content: clean,
    author_name: authorClean,
    position: maxPosition.maxp + 1,
    created_at: createdAt,
  };
}

/**
 * Moves a card to a new column and position.
 * Renumbers positions in both source and destination columns so ordering stays
 * dense (0..n-1) after every move.
 */
export function moveCard(
  cardId: string,
  targetColumnId: string,
  targetIndex: number
): { card: CardRow; sourceColumnId: string } | null {
  const card = db
    .prepare('SELECT * FROM cards WHERE id = ?')
    .get(cardId) as CardRow | undefined;
  if (!card) return null;

  const targetColumn = db
    .prepare('SELECT id FROM board_columns WHERE id = ?')
    .get(targetColumnId);
  if (!targetColumn) return null;

  const sourceColumnId = card.column_id;

  const tx = db.transaction(() => {
    // Pull the moving card out of the ordering
    db.prepare(
      'UPDATE cards SET position = -1 WHERE id = ?'
    ).run(cardId);

    // Close the gap in the source column
    if (sourceColumnId !== targetColumnId) {
      db.prepare(
        'UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?'
      ).run(sourceColumnId, card.position);
    }

    // Read current cards in target column (excluding moving one)
    const targetCards = db
      .prepare(
        'SELECT id FROM cards WHERE column_id = ? AND id != ? ORDER BY position ASC'
      )
      .all(targetColumnId, cardId) as { id: string }[];

    const clampedIndex = Math.max(0, Math.min(targetIndex, targetCards.length));

    if (sourceColumnId === targetColumnId) {
      // Same-column reorder — just rebuild the ordering
      targetCards.splice(clampedIndex, 0, { id: cardId });
      const update = db.prepare(
        'UPDATE cards SET position = ?, column_id = ? WHERE id = ?'
      );
      targetCards.forEach((row, i) => update.run(i, targetColumnId, row.id));
    } else {
      // Make room in target column, then place the card
      db.prepare(
        'UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?'
      ).run(targetColumnId, clampedIndex);
      db.prepare(
        'UPDATE cards SET column_id = ?, position = ? WHERE id = ?'
      ).run(targetColumnId, clampedIndex, cardId);
    }
  });
  tx();

  const updated = db
    .prepare('SELECT * FROM cards WHERE id = ?')
    .get(cardId) as CardRow;

  return { card: updated, sourceColumnId };
}

// ---------- Comments --------------------------------------------------------

export function createComment(
  cardId: string,
  content: string,
  authorName: string
): CommentRow | null {
  const card = db.prepare('SELECT id FROM cards WHERE id = ?').get(cardId);
  if (!card) return null;

  const clean = content.trim();
  if (!clean) return null;

  const id = nanoid(10);
  const createdAt = Date.now();
  const authorClean = authorName.trim() || 'Guest';

  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, cardId, clean, authorClean, createdAt);

  return {
    id,
    card_id: cardId,
    content: clean,
    author_name: authorClean,
    created_at: createdAt,
  };
}

// ---------- Board lookups for events ---------------------------------------

export function boardIdForColumn(columnId: string): string | null {
  const row = db
    .prepare('SELECT board_id FROM board_columns WHERE id = ?')
    .get(columnId) as { board_id: string } | undefined;
  return row?.board_id ?? null;
}

export function boardIdForCard(cardId: string): string | null {
  const row = db
    .prepare(
      `SELECT bc.board_id AS board_id
         FROM cards c
         JOIN board_columns bc ON bc.id = c.column_id
         WHERE c.id = ?`
    )
    .get(cardId) as { board_id: string } | undefined;
  return row?.board_id ?? null;
}
