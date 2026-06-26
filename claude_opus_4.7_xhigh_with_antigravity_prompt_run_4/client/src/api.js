async function request(path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    let detail;
    try {
      const data = await res.json();
      detail = data?.error || JSON.stringify(data);
    } catch {
      detail = await res.text();
    }
    const err = new Error(`${res.status}: ${detail || res.statusText}`);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listBoards: () => request('/api/boards'),
  createBoard: (title) => request('/api/boards', { method: 'POST', body: { title } }),
  getBoard: (id) => request(`/api/boards/${id}`),
  createColumn: (boardId, title) =>
    request(`/api/boards/${boardId}/columns`, { method: 'POST', body: { title } }),
  exportUrl: (boardId) => `/api/boards/${boardId}/export`,
};
