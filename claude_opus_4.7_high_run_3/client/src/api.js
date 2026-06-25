const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  listBoards: () => request('/boards'),
  createBoard: (title) =>
    request('/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  getBoard: (id) => request(`/boards/${id}`),
  createColumn: (boardId, title) =>
    request(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (boardId) => `${BASE}/boards/${boardId}/export`,
};
