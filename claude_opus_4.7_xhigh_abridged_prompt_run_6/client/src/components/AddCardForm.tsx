import { useState, type FormEvent } from 'react';

type Props = {
  onAdd: (content: string) => void;
};

export function AddCardForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');

  if (!open) {
    return (
      <button
        type="button"
        className="add-card-open"
        onClick={() => setOpen(true)}
      >
        <span className="plus">+</span>
        Add a card
      </button>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = content.trim();
    if (!value) return;
    onAdd(value);
    setContent('');
    setOpen(false);
  };

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <textarea
        className="textarea"
        autoFocus
        placeholder="What did you observe?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e);
          }
          if (e.key === 'Escape') {
            setContent('');
            setOpen(false);
          }
        }}
        maxLength={1000}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setContent('');
            setOpen(false);
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={!content.trim()}
        >
          Add card
        </button>
      </div>
    </form>
  );
}
