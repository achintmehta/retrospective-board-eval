const base = '/api';

async function request(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  listBoards: () => request('GET', '/boards'),
  createBoard: (title) => request('POST', '/boards', { title }),
  getBoard: (id) => request('GET', `/boards/${id}`),
  createColumn: (boardId, title) =>
    request('POST', `/boards/${boardId}/columns`, { title }),
  exportUrl: (boardId) => `${base}/boards/${boardId}/export`,
};
