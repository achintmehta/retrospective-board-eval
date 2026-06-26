async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch (_) {}
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listBoards: () => request('/api/boards'),
  createBoard: (title) =>
    request('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getBoard: (id) => request(`/api/boards/${id}`),
  createColumn: (boardId, title) =>
    request(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (boardId) => `/api/boards/${boardId}/export`,
};
