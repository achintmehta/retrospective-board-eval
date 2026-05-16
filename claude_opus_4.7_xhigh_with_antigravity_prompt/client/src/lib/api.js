async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore parse errors
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  listBoards: () => request('/api/boards'),
  createBoard: (title) =>
    request('/api/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  getBoard: (id) => request(`/api/boards/${encodeURIComponent(id)}`),
  createColumn: (boardId, title) =>
    request(`/api/boards/${encodeURIComponent(boardId)}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (boardId) => `/api/boards/${encodeURIComponent(boardId)}/export`,
};
