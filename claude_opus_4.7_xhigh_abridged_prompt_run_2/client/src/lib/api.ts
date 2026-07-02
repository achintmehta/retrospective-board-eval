import type { BoardSummary, BoardWithChildren, BoardColumnRow } from '../types';

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  async listBoards(): Promise<BoardSummary[]> {
    return jsonOrThrow(await fetch('/api/boards'));
  },
  async createBoard(title: string): Promise<BoardSummary> {
    return jsonOrThrow(
      await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
    );
  },
  async getBoard(id: string): Promise<BoardWithChildren> {
    return jsonOrThrow(await fetch(`/api/boards/${id}`));
  },
  async addColumn(boardId: string, title: string): Promise<BoardColumnRow> {
    return jsonOrThrow(
      await fetch(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
    );
  },
  exportUrl(boardId: string): string {
    return `/api/boards/${boardId}/export`;
  },
};
