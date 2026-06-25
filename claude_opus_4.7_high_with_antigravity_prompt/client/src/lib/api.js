async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error; } catch {}
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listBoards: () => request('/boards'),
  createBoard: (title) => request('/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  getBoard: (id) => request(`/boards/${id}`),
  addColumn: (boardId, title) =>
    request(`/boards/${boardId}/columns`, { method: 'POST', body: JSON.stringify({ title }) }),
  exportUrl: (boardId) => `/api/boards/${boardId}/export`
};
