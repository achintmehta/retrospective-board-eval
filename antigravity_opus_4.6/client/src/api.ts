const API_BASE = '/api';

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

export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: string;
  position: number;
  comments: Comment[];
}

export interface BoardWithDetails extends Board {
  columns: (BoardColumn & { cards: Card[] })[];
}

export async function fetchBoards(): Promise<Board[]> {
  const res = await fetch(`${API_BASE}/boards`);
  if (!res.ok) throw new Error('Failed to fetch boards');
  return res.json();
}

export async function createBoard(title: string): Promise<Board> {
  const res = await fetch(`${API_BASE}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create board');
  return res.json();
}

export async function fetchBoard(id: string): Promise<BoardWithDetails> {
  const res = await fetch(`${API_BASE}/boards/${id}`);
  if (!res.ok) throw new Error('Failed to fetch board');
  return res.json();
}

export async function createColumn(boardId: string, title: string): Promise<BoardColumn> {
  const res = await fetch(`${API_BASE}/boards/${boardId}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create column');
  return res.json();
}

export function getExportUrl(boardId: string): string {
  return `${API_BASE}/boards/${boardId}/export`;
}
