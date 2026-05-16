import Database from 'better-sqlite3';
import crypto from 'crypto';

// --- Type Definitions ---

export interface Board {
  id: string;
  title: string;
  created_at: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;
}

export interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: string;
  position: number;
}

export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface BoardWithDetails extends Board {
  columns: (BoardColumn & { cards: (Card & { comments: Comment[] })[] })[];
}

function generateId(): string {
  return crypto.randomUUID();
}

// --- Board Queries ---

export function createBoard(db: Database.Database, title: string): Board {
  const id = generateId();
  const stmt = db.prepare('INSERT INTO boards (id, title) VALUES (?, ?)');
  stmt.run(id, title);
  return getBoard(db, id)!;
}

export function getAllBoards(db: Database.Database): Board[] {
  return db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all() as Board[];
}

export function getBoard(db: Database.Database, id: string): Board | undefined {
  return db.prepare('SELECT * FROM boards WHERE id = ?').get(id) as Board | undefined;
}

export function getBoardWithDetails(db: Database.Database, boardId: string): BoardWithDetails | null {
  const board = getBoard(db, boardId);
  if (!board) return null;

  const columns = db.prepare(
    'SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC'
  ).all(boardId) as BoardColumn[];

  const columnsWithCards = columns.map((col) => {
    const cards = db.prepare(
      'SELECT * FROM cards WHERE column_id = ? ORDER BY position ASC'
    ).all(col.id) as Card[];

    const cardsWithComments = cards.map((card) => {
      const comments = db.prepare(
        'SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC'
      ).all(card.id) as Comment[];
      return { ...card, comments };
    });

    return { ...col, cards: cardsWithComments };
  });

  return { ...board, columns: columnsWithCards };
}

// --- Column Queries ---

export function createColumn(db: Database.Database, boardId: string, title: string): BoardColumn {
  const id = generateId();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM board_columns WHERE board_id = ?'
  ).get(boardId) as { maxPos: number };

  const position = maxPos.maxPos + 1;
  db.prepare('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)').run(
    id, boardId, title, position
  );

  return db.prepare('SELECT * FROM board_columns WHERE id = ?').get(id) as BoardColumn;
}

// --- Card Queries ---

export function createCard(
  db: Database.Database,
  columnId: string,
  content: string,
  authorName: string
): Card {
  const id = generateId();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), -1) as maxPos FROM cards WHERE column_id = ?'
  ).get(columnId) as { maxPos: number };

  const position = maxPos.maxPos + 1;
  db.prepare(
    'INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)'
  ).run(id, columnId, content, authorName, position);

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card;
}

export function moveCard(
  db: Database.Database,
  cardId: string,
  targetColumnId: string,
  newPosition: number
): Card | null {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as Card | undefined;
  if (!card) return null;

  db.prepare('UPDATE cards SET column_id = ?, position = ? WHERE id = ?').run(
    targetColumnId, newPosition, cardId
  );

  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) as Card;
}

// --- Comment Queries ---

export function createComment(
  db: Database.Database,
  cardId: string,
  content: string,
  authorName: string
): Comment {
  const id = generateId();
  db.prepare(
    'INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)'
  ).run(id, cardId, content, authorName);

  return db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as Comment;
}

// --- Export Queries ---

export function getBoardExportData(db: Database.Database, boardId: string) {
  const board = getBoard(db, boardId);
  if (!board) return null;

  const rows = db.prepare(`
    SELECT
      bc.title as column_title,
      c.content as card_content,
      c.author_name as card_author,
      c.created_at as card_created_at,
      cm.content as comment_content,
      cm.author_name as comment_author,
      cm.created_at as comment_created_at
    FROM board_columns bc
    LEFT JOIN cards c ON c.column_id = bc.id
    LEFT JOIN comments cm ON cm.card_id = c.id
    WHERE bc.board_id = ?
    ORDER BY bc.position, c.position, cm.created_at
  `).all(boardId);

  return { board, rows };
}
