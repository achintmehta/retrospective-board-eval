const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getBoards: () => request('/boards'),
  createBoard: (title) => request('/boards', {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),
  getBoard: (id) => request(`/boards/${id}`),
  createColumn: (boardId, title) => request(`/boards/${boardId}/columns`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  }),
  getExportUrl: (boardId) =>
    `${API_BASE}/boards/${boardId}/export`,
};
