// Thin fetch wrapper for the REST API. The Vite dev server proxies /api → the
// Express server, and in production the API is served by the same origin.
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let body = null;
  try {
    body = await res.json();
  } catch (_e) {
    // No JSON body (e.g., CSV export, 204). Caller should not need it.
  }
  if (!res.ok) {
    const message = body?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body;
}

export const api = {
  listBoards: () => request('/boards'),
  createBoard: (title) =>
    request('/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  getBoard: (id) => request(`/boards/${id}`),
  addColumn: (boardId, title) =>
    request(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (id) => `${BASE}/boards/${id}/export`,
};
