import type { Board, BoardColumn, BoardWithChildren } from './types';

async function request<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
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
  exportUrl: (boardId: string) => `/api/boards/${boardId}/export`,
};
