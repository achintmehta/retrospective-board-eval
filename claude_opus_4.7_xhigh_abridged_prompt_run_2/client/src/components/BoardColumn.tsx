import { useState, type ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { BoardColumnRow } from '../types';
import './BoardColumn.css';

interface BoardColumnProps {
  column: BoardColumnRow;
  accentIndex: number;
  dragCardId: string | null;
  children: ReactNode;
  onAddCard: (content: string) => void;
}

const ACCENT_CLASSES = ['tint-1', 'tint-2', 'tint-3', 'tint-4'];

export default function BoardColumn({
  column,
  accentIndex,
  dragCardId,
  children,
  onAddCard,
}: BoardColumnProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const { setNodeRef, isOver } = useDroppable({
    id: `col:${column.id}`,
  });

  const submit = () => {
    const clean = draft.trim();
    if (!clean) return;
    onAddCard(clean);
    setDraft('');
    setComposerOpen(false);
  };

  const cardCount = column.cards.length;
  const accentClass = ACCENT_CLASSES[accentIndex % ACCENT_CLASSES.length];

  return (
    <section className={`board-column ${accentClass}`} aria-label={column.title}>
      <header className="column-header">
        <div className="column-title">
          <span className="column-dot" aria-hidden />
          <h3>{column.title}</h3>
        </div>
        <span className="chip column-count">{cardCount}</span>
      </header>

      <div
        ref={setNodeRef}
        className={`column-body ${isOver ? 'is-over' : ''} ${dragCardId ? 'has-dragging' : ''}`}
      >
        {children}

        {cardCount === 0 && (
          <div className="column-empty">
            <span aria-hidden>✧</span>
            <span>Drop a card here or add a new one below.</span>
          </div>
        )}
      </div>

      <div className="column-composer">
        {composerOpen ? (
          <div className="composer-panel fade-in">
            <textarea
              autoFocus
              className="textarea composer-textarea"
              placeholder="What did you observe?"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
                if (e.key === 'Escape') {
                  setComposerOpen(false);
                  setDraft('');
                }
              }}
              maxLength={500}
            />
            <div className="composer-actions">
              <span className="text-tertiary tiny">⌘ + Enter to save</span>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setComposerOpen(false);
                    setDraft('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={!draft.trim()}
                  onClick={submit}
                >
                  Add card
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button className="add-card-trigger" onClick={() => setComposerOpen(true)}>
            <span aria-hidden className="plus">+</span>
            <span>Add card</span>
          </button>
        )}
      </div>
    </section>
  );
}
