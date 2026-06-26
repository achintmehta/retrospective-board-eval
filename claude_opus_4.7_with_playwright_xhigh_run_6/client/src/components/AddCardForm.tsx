import { useState, type FormEvent } from "react";

type Props = {
  onSubmit: (content: string) => void;
};

export default function AddCardForm({ onSubmit }: Props) {
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setContent("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="add-card-button"
        onClick={() => setOpen(true)}
      >
        + Add a card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={handleSubmit}>
      <textarea
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={1000}
        autoFocus
      />
      <div className="add-card-actions">
        <button type="submit" disabled={!content.trim()}>
          Add card
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setOpen(false);
            setContent("");
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
