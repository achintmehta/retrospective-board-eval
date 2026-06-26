import { useState, useRef, useEffect } from 'react';

export default function AddCard({ columnId, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setText('');
  };

  const submit = (e) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText('');
    if (textareaRef.current) textareaRef.current.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      submit();
    } else if (e.key === 'Escape') {
      close();
    }
  };

  return (
    <div className="add-card">
      {!open ? (
        <button
          type="button"
          className="add-card-trigger"
          onClick={() => setOpen(true)}
          id={`add-card-trigger-${columnId}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add a card
        </button>
      ) : (
        <form className="add-card-form" onSubmit={submit}>
          <textarea
            ref={textareaRef}
            className="textarea"
            placeholder="What's on your mind?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={1000}
            id={`add-card-textarea-${columnId}`}
          />
          <div className="add-card-actions">
            <button type="button" className="btn btn-secondary" onClick={close}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!text.trim()}
              id={`add-card-submit-${columnId}`}
            >
              Add card
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
