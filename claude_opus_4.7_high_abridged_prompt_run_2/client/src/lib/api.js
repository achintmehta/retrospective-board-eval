const base = '/api';

async function json(res) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  listBoards() {
    return fetch(`${base}/boards`).then(json).then((d) => d.boards);
  },
  createBoard(title) {
    return fetch(`${base}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
      .then(json)
      .then((d) => d.board);
  },
  getBoard(id) {
    return fetch(`${base}/boards/${id}`).then(json).then((d) => d.board);
  },
  addColumn(boardId, title, color) {
    return fetch(`${base}/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, color }),
    })
      .then(json)
      .then((d) => d.column);
  },
  exportUrl(id) {
    return `${base}/boards/${id}/export`;
  },
};
