const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const listBoards = () => request('/boards');
export const createBoard = (title) =>
  request('/boards', { method: 'POST', body: JSON.stringify({ title }) });
export const getBoard = (id) => request(`/boards/${id}`);
export const createColumn = (boardId, title) =>
  request(`/boards/${boardId}/columns`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });

export const exportBoardUrl = (boardId) => `${API_BASE}/boards/${boardId}/export`;
