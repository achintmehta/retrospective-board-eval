// Thin REST client. Uses relative URLs so the Vite dev proxy or the
// production server (which serves the static client itself) can route
// /api requests to the Express backend transparently.
const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, options);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && body.error) message = body.error;
    } catch {
      // ignore parse failure, keep generic message
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listBoards: () => request('/boards'),
  getBoard: (id) => request(`/boards/${encodeURIComponent(id)}`),
  createBoard: (payload) =>
    request('/boards', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) }),
  createColumn: (boardId, payload) =>
    request(`/boards/${encodeURIComponent(boardId)}/columns`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    }),
  exportCsvUrl: (boardId) => `/api/boards/${encodeURIComponent(boardId)}/export`,
};
