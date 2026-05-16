// Thin wrappers around the REST API. Socket-driven mutations live in socket.js.

async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
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
