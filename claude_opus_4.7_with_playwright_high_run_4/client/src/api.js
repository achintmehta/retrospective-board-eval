const BASE = '/api';

async function request(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  listBoards: () => request('/boards'),
  createBoard: (title) =>
    request('/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  getBoard: (id) => request(`/boards/${encodeURIComponent(id)}`),
  createColumn: (boardId, title) =>
    request(`/boards/${encodeURIComponent(boardId)}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title })
    }),
  exportUrl: (boardId) =>
    `${BASE}/boards/${encodeURIComponent(boardId)}/export`
};
