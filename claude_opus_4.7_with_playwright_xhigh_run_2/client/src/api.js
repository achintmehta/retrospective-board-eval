async function request(path, { method = 'GET', body, signal } = {}) {
  const init = { method, signal, headers: {} };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data && data.error) message = data.error;
    } catch {
      /* ignore */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  const contentType = res.headers.get('Content-Type') || '';
  return contentType.includes('application/json') ? res.json() : res.text();
}

export const api = {
  listBoards: () => request('/api/boards'),
  createBoard: (title, columns) => request('/api/boards', { method: 'POST', body: { title, columns } }),
  getBoard: (boardId) => request(`/api/boards/${boardId}`),
  addColumn: (boardId, title) =>
    request(`/api/boards/${boardId}/columns`, { method: 'POST', body: { title } }),
  exportUrl: (boardId) => `/api/boards/${boardId}/export`,
};
