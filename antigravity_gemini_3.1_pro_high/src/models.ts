import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';

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
  position: number;
  created_at: string;
}

export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export async function createBoard(title: string): Promise<Board> {
  const db = getDb();
  const id = uuidv4();
  await db.run('INSERT INTO boards (id, title) VALUES (?, ?)', [id, title]);
  return db.get('SELECT * FROM boards WHERE id = ?', [id]) as Promise<Board>;
}

export async function getBoards(): Promise<Board[]> {
  const db = getDb();
  return db.all('SELECT * FROM boards ORDER BY created_at DESC');
}

export async function getBoardById(id: string): Promise<Board | undefined> {
  const db = getDb();
  return db.get('SELECT * FROM boards WHERE id = ?', [id]);
}

export async function createColumn(board_id: string, title: string, position: number): Promise<BoardColumn> {
  const db = getDb();
  const id = uuidv4();
  await db.run('INSERT INTO board_columns (id, board_id, title, position) VALUES (?, ?, ?, ?)', [id, board_id, title, position]);
  return db.get('SELECT * FROM board_columns WHERE id = ?', [id]) as Promise<BoardColumn>;
}

export async function getColumnsByBoardId(board_id: string): Promise<BoardColumn[]> {
  const db = getDb();
  return db.all('SELECT * FROM board_columns WHERE board_id = ? ORDER BY position ASC', [board_id]);
}

export async function createCard(column_id: string, content: string, author_name: string, position: number): Promise<Card> {
  const db = getDb();
  const id = uuidv4();
  await db.run('INSERT INTO cards (id, column_id, content, author_name, position) VALUES (?, ?, ?, ?, ?)', [id, column_id, content, author_name, position]);
  return db.get('SELECT * FROM cards WHERE id = ?', [id]) as Promise<Card>;
}

export async function getCardsByBoardId(board_id: string): Promise<Card[]> {
  const db = getDb();
  return db.all(`
    SELECT cards.* FROM cards
    JOIN board_columns ON cards.column_id = board_columns.id
    WHERE board_columns.board_id = ?
    ORDER BY cards.position ASC
  `, [board_id]);
}

export async function moveCard(card_id: string, new_column_id: string, new_position: number): Promise<void> {
  const db = getDb();
  await db.run('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [new_column_id, new_position, card_id]);
}

export async function createComment(card_id: string, content: string, author_name: string): Promise<Comment> {
  const db = getDb();
  const id = uuidv4();
  await db.run('INSERT INTO comments (id, card_id, content, author_name) VALUES (?, ?, ?, ?)', [id, card_id, content, author_name]);
  return db.get('SELECT * FROM comments WHERE id = ?', [id]) as Promise<Comment>;
}

export async function getCommentsByBoardId(board_id: string): Promise<Comment[]> {
  const db = getDb();
  return db.all(`
    SELECT comments.* FROM comments
    JOIN cards ON comments.card_id = cards.id
    JOIN board_columns ON cards.column_id = board_columns.id
    WHERE board_columns.board_id = ?
    ORDER BY comments.created_at ASC
  `, [board_id]);
}
