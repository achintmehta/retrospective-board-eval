const jsonHeaders = { 'Content-Type': 'application/json' };

async function handle(res) {
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch (_) {
      /* no-op */
    }
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  async listBoards() {
    const res = await fetch('/api/boards');
    const data = await handle(res);
    return data.boards;
  },
  async createBoard(title) {
    const res = await fetch('/api/boards', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ title }),
    });
    const data = await handle(res);
    return data.board;
  },
  async getBoard(id) {
    const res = await fetch(`/api/boards/${encodeURIComponent(id)}`);
    const data = await handle(res);
    return data.board;
  },
  async addColumn(boardId, title) {
    const res = await fetch(`/api/boards/${encodeURIComponent(boardId)}/columns`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ title }),
    });
    const data = await handle(res);
    return data.column;
  },
  exportUrl(boardId) {
    return `/api/boards/${encodeURIComponent(boardId)}/export`;
  },
};
