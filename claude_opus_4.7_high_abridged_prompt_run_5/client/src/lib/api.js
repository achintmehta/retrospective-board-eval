const BASE = '/api';

async function json(res) {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  listBoards: () => fetch(`${BASE}/boards`).then(json),
  createBoard: (title) =>
    fetch(`${BASE}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then(json),
  getBoard: (id) => fetch(`${BASE}/boards/${id}`).then(json),
  createColumn: (id, title, color) =>
    fetch(`${BASE}/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, color }),
    }).then(json),
  exportUrl: (id) => `${BASE}/boards/${id}/export`,
};
