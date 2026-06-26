const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      message = data.error || message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  listBoards: () => request('/boards'),
  createBoard: (title) => request('/boards', { method: 'POST', body: { title } }),
  getBoard: (id) => request(`/boards/${id}`),
  createColumn: (boardId, title) =>
    request(`/boards/${boardId}/columns`, { method: 'POST', body: { title } }),
  exportUrl: (boardId) => `${BASE}/boards/${boardId}/export`,
};
