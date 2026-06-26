import { v4 as uuid } from "uuid";
import {
  db,
  transaction,
  type BoardRow,
  type CardRow,
  type ColumnRow,
  type CommentRow,
} from "./db.js";

export type CommentDTO = {
  id: string;
  cardId: string;
  content: string;
  authorName: string;
  createdAt: string;
};

export type CardDTO = {
  id: string;
  columnId: string;
  content: string;
  authorName: string;
  position: number;
  createdAt: string;
  comments: CommentDTO[];
};

export type ColumnDTO = {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  cards: CardDTO[];
};

export type BoardSummary = {
  id: string;
  title: string;
  createdAt: string;
};

export type BoardDetail = BoardSummary & {
  columns: ColumnDTO[];
};

const DEFAULT_COLUMN_TITLES = [
  "Went Well",
  "Needs Improvement",
  "Action Items",
];

function toBoardSummary(row: BoardRow): BoardSummary {
  return { id: row.id, title: row.title, createdAt: row.created_at };
}

function toColumnDTO(row: ColumnRow, cards: CardDTO[]): ColumnDTO {
  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position,
    createdAt: row.created_at,
    cards,
  };
}

function toCardDTO(row: CardRow, comments: CommentDTO[]): CardDTO {
  return {
    id: row.id,
    columnId: row.column_id,
    content: row.content,
    authorName: row.author_name,
    position: row.position,
    createdAt: row.created_at,
    comments,
  };
}

function toCommentDTO(row: CommentRow): CommentDTO {
  return {
    id: row.id,
    cardId: row.card_id,
    content: row.content,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

const insertBoardStmt = db.prepare(
  "INSERT INTO boards (id, title) VALUES (?, ?)",
);
const insertColumnStmt = db.prepare(
  "INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)",
);
const selectBoardsStmt = db.prepare(
  "SELECT * FROM boards ORDER BY datetime(created_at) DESC",
);
const selectBoardStmt = db.prepare("SELECT * FROM boards WHERE id = ?");
const selectColumnsForBoardStmt = db.prepare(
  "SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC, datetime(created_at) ASC",
);
const selectCardsForBoardStmt = db.prepare(
  `SELECT cards.* FROM cards
     INNER JOIN board_columns ON board_columns.id = cards.column_id
     WHERE board_columns.board_id = ?
     ORDER BY cards.position ASC, datetime(cards.created_at) ASC`,
);
const selectCommentsForBoardStmt = db.prepare(
  `SELECT comments.* FROM comments
     INNER JOIN cards ON cards.id = comments.card_id
     INNER JOIN board_columns ON board_columns.id = cards.column_id
     WHERE board_columns.board_id = ?
     ORDER BY datetime(comments.created_at) ASC`,
);
const selectMaxColumnPositionStmt = db.prepare(
  "SELECT COALESCE(MAX(position), -1) AS max FROM board_columns WHERE board_id = ?",
);
const selectMaxCardPositionStmt = db.prepare(
  "SELECT COALESCE(MAX(position), -1) AS max FROM cards WHERE column_id = ?",
);
const selectCardStmt = db.prepare("SELECT * FROM cards WHERE id = ?");
const selectColumnStmt = db.prepare(
  "SELECT * FROM board_columns WHERE id = ?",
);
const insertCardStmt = db.prepare(
  "INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)",
);
const updateCardPositionStmt = db.prepare(
  "UPDATE cards SET column_id = ?, position = ? WHERE id = ?",
);
const reorderColumnCardsStmt = db.prepare(
  `SELECT id FROM cards WHERE column_id = ? ORDER BY position ASC, datetime(created_at) ASC`,
);
const setCardPositionStmt = db.prepare(
  "UPDATE cards SET position = ? WHERE id = ?",
);
const insertCommentStmt = db.prepare(
  "INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)",
);

export function createBoard(title: string): BoardDetail {
  const id = uuid();
  transaction(() => {
    insertBoardStmt.run(id, title);
    DEFAULT_COLUMN_TITLES.forEach((columnTitle, index) => {
      insertColumnStmt.run(uuid(), id, columnTitle, index);
    });
  });
  const board = getBoard(id);
  if (!board) {
    throw new Error("Failed to create board");
  }
  return board;
}

export function listBoards(): BoardSummary[] {
  const rows = selectBoardsStmt.all() as BoardRow[];
  return rows.map(toBoardSummary);
}

export function getBoard(boardId: string): BoardDetail | null {
  const boardRow = selectBoardStmt.get(boardId) as BoardRow | undefined;
  if (!boardRow) return null;

  const columnRows = selectColumnsForBoardStmt.all(boardId) as ColumnRow[];
  const cardRows = selectCardsForBoardStmt.all(boardId) as CardRow[];
  const commentRows = selectCommentsForBoardStmt.all(boardId) as CommentRow[];

  const commentsByCard = new Map<string, CommentDTO[]>();
  for (const row of commentRows) {
    const list = commentsByCard.get(row.card_id) ?? [];
    list.push(toCommentDTO(row));
    commentsByCard.set(row.card_id, list);
  }

  const cardsByColumn = new Map<string, CardDTO[]>();
  for (const row of cardRows) {
    const list = cardsByColumn.get(row.column_id) ?? [];
    list.push(toCardDTO(row, commentsByCard.get(row.id) ?? []));
    cardsByColumn.set(row.column_id, list);
  }

  const columns = columnRows.map((row) =>
    toColumnDTO(row, cardsByColumn.get(row.id) ?? []),
  );

  return { ...toBoardSummary(boardRow), columns };
}

export function createColumn(boardId: string, title: string): ColumnDTO {
  const boardRow = selectBoardStmt.get(boardId) as BoardRow | undefined;
  if (!boardRow) {
    throw new Error("Board not found");
  }
  const id = uuid();
  const maxRow = selectMaxColumnPositionStmt.get(boardId) as { max: number };
  const position = maxRow.max + 1;
  insertColumnStmt.run(id, boardId, title, position);
  const row = selectColumnStmt.get(id) as ColumnRow;
  return toColumnDTO(row, []);
}

export function createCard(
  columnId: string,
  content: string,
  authorName: string,
): { card: CardDTO; boardId: string } {
  const columnRow = selectColumnStmt.get(columnId) as ColumnRow | undefined;
  if (!columnRow) {
    throw new Error("Column not found");
  }
  const id = uuid();
  const maxRow = selectMaxCardPositionStmt.get(columnId) as { max: number };
  const position = maxRow.max + 1;
  insertCardStmt.run(id, columnId, content, authorName, position);
  const row = selectCardStmt.get(id) as CardRow;
  return {
    card: toCardDTO(row, []),
    boardId: columnRow.board_id,
  };
}

export function moveCard(
  cardId: string,
  targetColumnId: string,
  targetIndex: number,
): { card: CardDTO; boardId: string; sourceColumnId: string } {
  const existing = selectCardStmt.get(cardId) as CardRow | undefined;
  if (!existing) {
    throw new Error("Card not found");
  }
  const targetColumn = selectColumnStmt.get(targetColumnId) as
    | ColumnRow
    | undefined;
  if (!targetColumn) {
    throw new Error("Target column not found");
  }

  const sourceColumnId = existing.column_id;

  transaction(() => {
    updateCardPositionStmt.run(targetColumnId, -1, cardId);

    const reorderColumn = (columnId: string) => {
      const rows = reorderColumnCardsStmt.all(columnId) as { id: string }[];
      const ids = rows
        .filter((r) => r.id !== cardId)
        .map((r) => r.id);

      if (columnId === targetColumnId) {
        const clamped = Math.max(0, Math.min(targetIndex, ids.length));
        ids.splice(clamped, 0, cardId);
      }

      ids.forEach((id, idx) => {
        setCardPositionStmt.run(idx, id);
      });
    };

    if (sourceColumnId !== targetColumnId) {
      reorderColumn(sourceColumnId);
    }
    reorderColumn(targetColumnId);
  });

  const updated = selectCardStmt.get(cardId) as CardRow;
  return {
    card: toCardDTO(updated, []),
    boardId: targetColumn.board_id,
    sourceColumnId,
  };
}

export function createComment(
  cardId: string,
  content: string,
  authorName: string,
): { comment: CommentDTO; boardId: string } {
  const cardRow = selectCardStmt.get(cardId) as CardRow | undefined;
  if (!cardRow) {
    throw new Error("Card not found");
  }
  const columnRow = selectColumnStmt.get(cardRow.column_id) as ColumnRow;
  const id = uuid();
  insertCommentStmt.run(id, cardId, content, authorName);
  const row = db
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(id) as CommentRow;
  return {
    comment: toCommentDTO(row),
    boardId: columnRow.board_id,
  };
}

export function listCommentsForCard(cardId: string): CommentDTO[] {
  const rows = db
    .prepare(
      "SELECT * FROM comments WHERE card_id = ? ORDER BY datetime(created_at) ASC",
    )
    .all(cardId) as CommentRow[];
  return rows.map(toCommentDTO);
}

