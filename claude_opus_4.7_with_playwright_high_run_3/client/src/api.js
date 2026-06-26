async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error; } catch {}
    throw new Error(detail || `${method} ${url} failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listBoards: () => request('GET', '/api/boards'),
  createBoard: (title) => request('POST', '/api/boards', { title }),
  getBoard: (id) => request('GET', `/api/boards/${id}`),
  createColumn: (boardId, title) =>
    request('POST', `/api/boards/${boardId}/columns`, { title }),
  exportUrl: (boardId) => `/api/boards/${boardId}/export`,
};
