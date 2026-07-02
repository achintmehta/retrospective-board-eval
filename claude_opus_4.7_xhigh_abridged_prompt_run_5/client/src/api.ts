import type { Board, BoardDetail, Column } from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
    throw new Error(msg);
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
  getBoard: (id: string) => request<BoardDetail>(`/api/boards/${id}`),
  createColumn: (boardId: string, title: string) =>
    request<Column>(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (boardId: string) => `/api/boards/${boardId}/export`,
};
