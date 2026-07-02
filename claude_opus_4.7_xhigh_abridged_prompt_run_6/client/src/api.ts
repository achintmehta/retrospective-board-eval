export type Board = {
  id: string;
  title: string;
  created_at: number;
};

export type BoardSummary = Board & { card_count: number };

export type Comment = {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: number;
};

export type Card = {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  position: number;
  created_at: number;
  comments: Comment[];
};

export type BoardColumn = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  accent: string;
  cards: Card[];
};

export type BoardDetail = Board & { columns: BoardColumn[] };

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
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const api = {
  listBoards: () => request<BoardSummary[]>('/api/boards'),
  createBoard: (title: string) =>
    request<Board>('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getBoard: (id: string) => request<BoardDetail>(`/api/boards/${id}`),
  createColumn: (boardId: string, title: string, accent = 'violet') =>
    request<BoardColumn>(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title, accent }),
    }),
  exportUrl: (boardId: string) => `/api/boards/${boardId}/export`,
};
