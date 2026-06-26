async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.error || '';
    } catch (_) {}
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listBoards: () => request('/boards'),
  createBoard: (title, columnTitles) =>
    request('/boards', {
      method: 'POST',
      body: JSON.stringify({ title, columnTitles }),
    }),
  getBoard: (id) => request(`/boards/${id}`),
  createColumn: (boardId, title) =>
    request(`/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (boardId) => `/api/boards/${boardId}/export`,
};
