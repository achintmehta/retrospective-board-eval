const API_BASE = '/api';

async function handle(res) {
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.error || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }
  return res.json();
}

export async function listBoards() {
  return handle(await fetch(`${API_BASE}/boards`));
}

export async function createBoard(title) {
  return handle(
    await fetch(`${API_BASE}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  );
}

export async function getBoard(boardId) {
  return handle(await fetch(`${API_BASE}/boards/${boardId}`));
}

export async function createColumn(boardId, title) {
  return handle(
    await fetch(`${API_BASE}/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  );
}

export function exportBoardUrl(boardId) {
  return `${API_BASE}/boards/${boardId}/export`;
}
