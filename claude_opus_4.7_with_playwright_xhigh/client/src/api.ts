import type { Board, BoardColumn, FullBoard } from './types';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function fetchBoards(): Promise<Board[]> {
  return handle<Board[]>(await fetch('/api/boards'));
}

export async function createBoard(title: string): Promise<Board> {
  return handle<Board>(
    await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  );
}

export async function fetchBoard(id: string): Promise<FullBoard> {
  return handle<FullBoard>(await fetch(`/api/boards/${id}`));
}

export async function createColumn(
  boardId: string,
  title: string
): Promise<BoardColumn> {
  return handle<BoardColumn>(
    await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  );
}

export function exportBoardCsvUrl(boardId: string): string {
  return `/api/boards/${boardId}/export`;
}
