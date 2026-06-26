const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body && body.error) detail = body.error;
    } catch {}
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listBoards: () => request('/boards').then((b) => b.boards),
  createBoard: (title, columns) =>
    request('/boards', {
      method: 'POST',
      body: JSON.stringify({ title, columns })
    }).then((b) => b.board),
  getBoard: (id) => request(`/boards/${id}`).then((b) => b.board),
  createColumn: (boardId, title) =>
    request(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title })
    }).then((b) => b.column),
  exportUrl: (boardId) => `${BASE}/boards/${boardId}/export`
};
