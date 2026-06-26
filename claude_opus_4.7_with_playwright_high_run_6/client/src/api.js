async function jsonRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  listBoards: () => jsonRequest('/api/boards'),
  createBoard: (title) =>
    jsonRequest('/api/boards', { method: 'POST', body: JSON.stringify({ title }) }),
  getBoard: (id) => jsonRequest(`/api/boards/${id}`),
  createColumn: (boardId, title) =>
    jsonRequest(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  exportUrl: (boardId) => `/api/boards/${boardId}/export`,
};
