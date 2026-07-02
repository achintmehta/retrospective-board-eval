import type { Board, BoardColumn, FullBoard } from './types';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listBoards: (): Promise<Board[]> =>
    fetch('/api/boards').then((r) => handle<Board[]>(r)),

  createBoard: (title: string): Promise<Board> =>
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then((r) => handle<Board>(r)),

  getBoard: (id: string): Promise<FullBoard> =>
    fetch(`/api/boards/${id}`).then((r) => handle<FullBoard>(r)),

  createColumn: (boardId: string, title: string): Promise<BoardColumn> =>
    fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then((r) => handle<BoardColumn>(r)),

  exportUrl: (boardId: string) => `/api/boards/${boardId}/export`,
};
