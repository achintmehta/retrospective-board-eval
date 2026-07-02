const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listBoards: () => request('/boards'),
  createBoard: (title, columns) =>
    request('/boards', {
      method: 'POST',
      body: JSON.stringify({ title, columns }),
    }),
  getBoard: (id) => request(`/boards/${encodeURIComponent(id)}`),
  createColumn: (boardId, title) =>
    request(`/boards/${encodeURIComponent(boardId)}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (boardId) => `${API_BASE}/boards/${encodeURIComponent(boardId)}/export`,
};
