import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createBoard, listBoards } from "../api";
import type { BoardSummary } from "../types";

function formatDate(value: string): string {
  try {
    return new Date(value + "Z").toLocaleString();
  } catch {
    return value;
  }
}

export default function MainPage() {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    listBoards()
      .then((data) => {
        if (!cancelled) setBoards(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const board = await createBoard(trimmed);
      navigate(`/boards/${board.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="main-page">
      <section className="create-board-section">
        <h2>Create a new board</h2>
        <form className="create-board-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="e.g. Sprint 42 retrospective"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            aria-label="Board title"
            required
          />
          <button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Creating…" : "Create Board"}
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
      </section>

      <section className="board-list-section">
        <h2>Existing boards</h2>
        {boards === null && <p className="muted">Loading…</p>}
        {boards && boards.length === 0 && (
          <p className="muted">No boards yet. Create one to get started.</p>
        )}
        {boards && boards.length > 0 && (
          <ul className="board-list">
            {boards.map((board) => (
              <li key={board.id} className="board-list-item">
                <a href={`/boards/${board.id}`} onClick={(e) => {
                  e.preventDefault();
                  navigate(`/boards/${board.id}`);
                }}>
                  <span className="board-list-title">{board.title}</span>
                  <span className="board-list-meta">
                    Created {formatDate(board.createdAt)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
