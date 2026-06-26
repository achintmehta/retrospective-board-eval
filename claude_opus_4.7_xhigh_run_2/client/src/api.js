async function handle(res) {
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch (_) {}
    throw new Error(message);
  }
  return res.json();
}

export async function fetchBoards() {
  return handle(await fetch('/api/boards'));
}

export async function createBoardApi(title) {
  return handle(
    await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  );
}

export async function fetchBoard(boardId) {
  return handle(await fetch(`/api/boards/${boardId}`));
}

export async function createColumnApi(boardId, title) {
  return handle(
    await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  );
}

export function exportBoardUrl(boardId) {
  return `/api/boards/${boardId}/export`;
}
