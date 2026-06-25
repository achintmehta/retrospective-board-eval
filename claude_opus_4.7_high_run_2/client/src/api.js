const BASE = '/api';

async function jsonOrThrow(res) {
  if (!res.ok) {
    let msg = `Request failed with ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch (_e) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function listBoards() {
  const res = await fetch(`${BASE}/boards`);
  return jsonOrThrow(res);
}

export async function createBoard(title) {
  const res = await fetch(`${BASE}/boards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return jsonOrThrow(res);
}

export async function getBoard(id) {
  const res = await fetch(`${BASE}/boards/${id}`);
  return jsonOrThrow(res);
}

export async function createColumn(boardId, title) {
  const res = await fetch(`${BASE}/boards/${boardId}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return jsonOrThrow(res);
}

export function exportBoardUrl(boardId) {
  return `${BASE}/boards/${boardId}/export`;
}
