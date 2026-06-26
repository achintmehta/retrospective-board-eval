// SQLite layer. We use Node's built-in `node:sqlite` (stable in Node 22+),
// which gives us a synchronous, transactional API without any native
// compilation step — important for a zero-config self-hosted app. Schema
// is created on first boot so a fresh container starts with a valid DB.
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.RETRO_DATA_DIR
  ? resolve(process.env.RETRO_DATA_DIR)
  : resolve(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, 'retro.sqlite');
export const db = new DatabaseSync(DB_PATH);

// WAL mode → much better concurrent read/write behavior, which matters
// when several clients hit the board simultaneously.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS board_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_board_columns_board_id ON board_columns(board_id);

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    column_id INTEGER NOT NULL REFERENCES board_columns(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id);
`);

// node:sqlite doesn't expose a `transaction()` helper like better-sqlite3,
// so we wrap it ourselves. Rolls back on any thrown error.
function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* ignored */ }
    throw err;
  }
}

// -------- Prepared statements --------
const stmts = {
  insertBoard: db.prepare('INSERT INTO boards (id, title) VALUES (@id, @title)'),
  getBoard: db.prepare('SELECT * FROM boards WHERE id = ?'),
  listBoards: db.prepare('SELECT * FROM boards ORDER BY datetime(created_at) DESC'),
  insertColumn: db.prepare(
    'INSERT INTO board_columns (board_id, title, position) VALUES (@board_id, @title, @position)',
  ),
  listColumns: db.prepare('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC, id ASC'),
  getColumn: db.prepare('SELECT * FROM board_columns WHERE id = ?'),
  getColumnBoard: db.prepare('SELECT board_id FROM board_columns WHERE id = ?'),
  maxColumnPosition: db.prepare('SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?'),
  insertCard: db.prepare(
    'INSERT INTO cards (column_id, content, author_name, position) VALUES (@column_id, @content, @author_name, @position)',
  ),
  listCards: db.prepare(`
    SELECT c.* FROM cards c
    INNER JOIN board_columns col ON col.id = c.column_id
    WHERE col.board_id = ?
    ORDER BY c.column_id, c.position ASC, c.id ASC
  `),
  cardsInColumnOrdered: db.prepare('SELECT id, position FROM cards WHERE column_id = ? ORDER BY position ASC, id ASC'),
  cardById: db.prepare('SELECT * FROM cards WHERE id = ?'),
  updateCardPositionColumn: db.prepare(
    'UPDATE cards SET column_id = @column_id, position = @position WHERE id = @id',
  ),
  maxCardPosition: db.prepare('SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?'),
  insertComment: db.prepare(
    'INSERT INTO comments (card_id, content, author_name) VALUES (@card_id, @content, @author_name)',
  ),
  getComment: db.prepare('SELECT * FROM comments WHERE id = ?'),
  listComments: db.prepare(`
    SELECT cm.* FROM comments cm
    INNER JOIN cards c ON c.id = cm.card_id
    INNER JOIN board_columns col ON col.id = c.column_id
    WHERE col.board_id = ?
    ORDER BY cm.card_id, datetime(cm.created_at) ASC, cm.id ASC
  `),
  cardBoardId: db.prepare(`
    SELECT col.board_id FROM cards c
    INNER JOIN board_columns col ON col.id = c.column_id
    WHERE c.id = ?
  `),
};

// node:sqlite returns BigInt for INTEGER PRIMARY KEY by default in some
// configurations. Coerce to Number so JSON serialization stays clean for
// every value that's safely within Number.MAX_SAFE_INTEGER (always true here).
function coerceIds(row) {
  if (!row) return row;
  for (const key of Object.keys(row)) {
    if (typeof row[key] === 'bigint') row[key] = Number(row[key]);
  }
  return row;
}
function coerceList(rows) { rows.forEach(coerceIds); return rows; }

// -------- API used by routes & sockets --------
export const boardsRepo = {
  list() {
    return coerceList(stmts.listBoards.all());
  },
  get(id) {
    const board = coerceIds(stmts.getBoard.get(id));
    if (!board) return null;
    return {
      board,
      columns: coerceList(stmts.listColumns.all(id)),
      cards: coerceList(stmts.listCards.all(id)),
      comments: coerceList(stmts.listComments.all(id)),
    };
  },
  exists(id) {
    return !!stmts.getBoard.get(id);
  },
  create({ id, title, columns }) {
    withTransaction(() => {
      stmts.insertBoard.run({ id, title });
      if (Array.isArray(columns)) {
        columns.forEach((col, idx) => {
          stmts.insertColumn.run({ board_id: id, title: col.title, position: idx });
        });
      }
    });
    return coerceIds(stmts.getBoard.get(id));
  },
};

export const columnsRepo = {
  listForBoard(boardId) {
    return coerceList(stmts.listColumns.all(boardId));
  },
  create({ board_id, title }) {
    const max = Number(stmts.maxColumnPosition.get(board_id).max);
    const info = stmts.insertColumn.run({ board_id, title, position: max + 1 });
    return coerceIds(stmts.getColumn.get(Number(info.lastInsertRowid)));
  },
  boardIdOf(columnId) {
    const row = stmts.getColumnBoard.get(columnId);
    return row ? row.board_id : null;
  },
};

export const cardsRepo = {
  create({ column_id, content, author_name }) {
    const max = Number(stmts.maxCardPosition.get(column_id).max);
    const info = stmts.insertCard.run({
      column_id, content, author_name, position: max + 1,
    });
    return coerceIds(stmts.cardById.get(Number(info.lastInsertRowid)));
  },
  boardIdOf(cardId) {
    const row = stmts.cardBoardId.get(cardId);
    return row ? row.board_id : null;
  },
  move({ card_id, to_column_id, to_position }) {
    const card = coerceIds(stmts.cardById.get(card_id));
    if (!card) return null;
    const fromColumnId = card.column_id;

    withTransaction(() => {
      const sourceIds = stmts.cardsInColumnOrdered.all(fromColumnId)
        .map((r) => Number(r.id))
        .filter((id) => id !== card_id);

      let destIds = fromColumnId === to_column_id
        ? sourceIds
        : stmts.cardsInColumnOrdered.all(to_column_id).map((r) => Number(r.id)).filter((id) => id !== card_id);

      const clampedIdx = Math.max(0, Math.min(to_position, destIds.length));
      destIds = [...destIds.slice(0, clampedIdx), card_id, ...destIds.slice(clampedIdx)];

      if (fromColumnId !== to_column_id) {
        sourceIds.forEach((id, idx) => {
          stmts.updateCardPositionColumn.run({ id, column_id: fromColumnId, position: idx });
        });
      }
      destIds.forEach((id, idx) => {
        stmts.updateCardPositionColumn.run({ id, column_id: to_column_id, position: idx });
      });
    });

    const orderedRows = stmts.cardsInColumnOrdered.all(to_column_id);
    let sourceOrderedRows = [];
    if (fromColumnId !== to_column_id) {
      sourceOrderedRows = stmts.cardsInColumnOrdered.all(fromColumnId);
    }
    return {
      card_id,
      from_column_id: fromColumnId,
      to_column_id,
      ordered_cards: orderedRows.map((r) => ({ id: Number(r.id), position: Number(r.position) })),
      source_ordered_cards: sourceOrderedRows.map((r) => ({ id: Number(r.id), position: Number(r.position) })),
    };
  },
};

export const commentsRepo = {
  create({ card_id, content, author_name }) {
    const info = stmts.insertComment.run({ card_id, content, author_name });
    return coerceIds(stmts.getComment.get(Number(info.lastInsertRowid)));
  },
};

export function exportBoardRows(boardId) {
  const rows = db.prepare(`
    SELECT
      b.title AS board_title,
      col.title AS column_title,
      col.position AS column_position,
      c.id AS card_id,
      c.content AS card_content,
      c.author_name AS card_author,
      c.position AS card_position,
      c.created_at AS card_created_at,
      cm.id AS comment_id,
      cm.content AS comment_content,
      cm.author_name AS comment_author,
      cm.created_at AS comment_created_at
    FROM boards b
    INNER JOIN board_columns col ON col.board_id = b.id
    LEFT JOIN cards c ON c.column_id = col.id
    LEFT JOIN comments cm ON cm.card_id = c.id
    WHERE b.id = ?
    ORDER BY col.position ASC, col.id ASC,
             c.position ASC, c.id ASC,
             datetime(cm.created_at) ASC, cm.id ASC
  `).all(boardId);
  return coerceList(rows);
}
