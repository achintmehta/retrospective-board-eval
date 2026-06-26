async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

export const api = {
  listBoards: () => request('/api/boards'),
  createBoard: (title) =>
    request('/api/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  getBoard: (id) => request(`/api/boards/${id}`),
  createColumn: (boardId, title) =>
    request(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (boardId) => `/api/boards/${boardId}/export`,
};
