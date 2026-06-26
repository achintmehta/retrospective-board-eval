import type { BoardColumn, BoardDetail, BoardSummary } from "./types";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export function listBoards(): Promise<BoardSummary[]> {
  return request<BoardSummary[]>("/api/boards");
}

export function createBoard(title: string): Promise<BoardDetail> {
  return request<BoardDetail>("/api/boards", {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function getBoard(id: string): Promise<BoardDetail> {
  return request<BoardDetail>(`/api/boards/${id}`);
}

export function createColumn(
  boardId: string,
  title: string,
): Promise<BoardColumn> {
  return request<BoardColumn>(`/api/boards/${boardId}/columns`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

export function exportBoardUrl(boardId: string): string {
  return `/api/boards/${boardId}/export`;
}
