import { useState, useEffect, useRef } from 'react';

export default function AddCardForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const submit = async (e) => {
    e?.preventDefault?.();
    const text = value.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await onAdd(text);
      setValue('');
      setOpen(false);
    } catch (err) {
      // Surface error inline via alert for simplicity; non-fatal
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="add-card-button" onClick={() => setOpen(true)}>
        + Add card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={submit}>
      <textarea
        ref={ref}
        className="textarea"
        value={value}
        maxLength={2000}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            submit(e);
          } else if (e.key === 'Escape') {
            setOpen(false);
            setValue('');
          }
        }}
        placeholder="What's on your mind?"
      />
      <div className="actions">
        <button type="submit" className="btn btn-sm" disabled={submitting || !value.trim()}>
          {submitting ? 'Adding…' : 'Add'}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setOpen(false);
            setValue('');
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
