// Per-board display name persisted in sessionStorage.
const KEY = (boardId) => `retro:displayName:${boardId}`;

export function getDisplayName(boardId) {
  try {
    return sessionStorage.getItem(KEY(boardId)) || '';
  } catch {
    return '';
  }
}

export function setDisplayName(boardId, name) {
  try {
    sessionStorage.setItem(KEY(boardId), name);
  } catch {
    /* ignore */
  }
}
