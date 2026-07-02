import { useEffect, useRef, useState } from 'react';
import './GuestAuthModal.css';

interface GuestAuthModalProps {
  open: boolean;
  boardTitle?: string;
  onSubmit: (name: string) => void;
}

export default function GuestAuthModal({ open, boardTitle, onSubmit }: GuestAuthModalProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const trimmed = value.trim();
  const canSubmit = trimmed.length >= 1;

  const submit = () => {
    if (canSubmit) onSubmit(trimmed);
  };

  return (
    <div className="modal-backdrop fade-in" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title">
      <div className="modal-card scale-in">
        <div className="modal-glow" aria-hidden />
        <div className="modal-eyebrow">
          <span className="pulse-dot" aria-hidden />
          <span>Joining live session</span>
        </div>
        <h2 id="guest-modal-title" className="modal-title">
          What should we call you<span className="gradient-text">?</span>
        </h2>
        <p className="modal-sub">
          {boardTitle
            ? `Others in "${boardTitle}" will see this name on your cards and comments.`
            : 'Others in this retro will see this name on your cards and comments.'}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="stack-3 mt-4"
        >
          <input
            ref={inputRef}
            className="input"
            placeholder="e.g. Alex Rivera"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={40}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            Join board
            <span aria-hidden style={{ fontSize: '1.05em' }}>→</span>
          </button>
        </form>
        <p className="modal-footnote">No accounts, no tracking. Your name is only stored in this browser.</p>
      </div>
    </div>
  );
}
