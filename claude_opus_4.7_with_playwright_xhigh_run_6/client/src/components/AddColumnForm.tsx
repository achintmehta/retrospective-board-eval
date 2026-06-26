import { useState, type FormEvent } from "react";

type Props = {
  onSubmit: (title: string) => void;
};

export default function AddColumnForm({ onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setTitle("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-column-button"
        onClick={() => setOpen(true)}
      >
        + Add column
      </button>
    );
  }

  return (
    <form className="add-column-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Column name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        autoFocus
      />
      <div className="add-column-actions">
        <button type="submit" disabled={!title.trim()}>
          Add
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setOpen(false);
            setTitle("");
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
