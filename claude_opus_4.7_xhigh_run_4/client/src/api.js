const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function listBoards() {
  return request('/boards');
}

export function createBoard(title) {
  return request('/boards', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function fetchBoard(boardId) {
  return request(`/boards/${boardId}`);
}

export function createColumn(boardId, title) {
  return request(`/boards/${boardId}/columns`, {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export function exportBoardUrl(boardId) {
  return `${BASE}/boards/${boardId}/export`;
}
