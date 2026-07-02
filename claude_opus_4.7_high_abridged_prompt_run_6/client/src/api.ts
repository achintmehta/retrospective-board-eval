import type { Board, BoardSummary, Column } from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listBoards: () => fetch('/api/boards').then((r) => json<BoardSummary[]>(r)),
  getBoard: (id: string) =>
    fetch(`/api/boards/${id}`).then((r) => json<Board>(r)),
  createBoard: (title: string) =>
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then((r) => json<BoardSummary>(r)),
  createColumn: (boardId: string, title: string) =>
    fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then((r) => json<Column>(r)),
  exportUrl: (boardId: string) => `/api/boards/${boardId}/export`,
};
