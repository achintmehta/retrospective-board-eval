import { useState } from 'react';

export default function AddCardForm({ onSubmit }) {
  const [content, setContent] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        className="card-form__stub"
        onClick={() => setExpanded(true)}
      >
        + Add card
      </button>
    );
  }

  return (
    <form className="card-form" onSubmit={submit}>
      <textarea
        autoFocus
        className="textarea"
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        rows={3}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(e);
          if (e.key === 'Escape') {
            setExpanded(false);
            setContent('');
          }
        }}
      />
      <div className="card-form__row">
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setExpanded(false);
            setContent('');
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--primary btn--sm"
          disabled={submitting || !content.trim()}
        >
          {submitting ? 'Adding…' : 'Add card'}
        </button>
      </div>
    </form>
  );
}
