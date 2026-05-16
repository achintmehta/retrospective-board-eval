const BASE = '/api';

async function request(path, init) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
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
