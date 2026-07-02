export interface Board {
  id: string;
  title: string;
  created_at: number;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: number;
}

export interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  position: number;
  created_at: number;
}

export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: number;
}

export interface BoardWithChildren extends Board {
  columns: (BoardColumn & { cards: (Card & { comments: Comment[] })[] })[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(message || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listBoards: () => request<Board[]>('/api/boards'),
  createBoard: (title: string) =>
    request<Board>('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getBoard: (id: string) => request<BoardWithChildren>(`/api/boards/${id}`),
  createColumn: (boardId: string, title: string) =>
    request<BoardColumn>(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (id: string) => `/api/boards/${id}/export`,
};
