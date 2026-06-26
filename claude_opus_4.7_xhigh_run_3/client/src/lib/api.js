const BASE = '/api';

async function jsonRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listBoards: () => jsonRequest('/boards'),
  createBoard: (title) => jsonRequest('/boards', { method: 'POST', body: { title } }),
  getBoard: (id) => jsonRequest(`/boards/${id}`),
  createColumn: (boardId, title) =>
    jsonRequest(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: { title },
    }),
  exportUrl: (boardId) => `${BASE}/boards/${boardId}/export`,
};
