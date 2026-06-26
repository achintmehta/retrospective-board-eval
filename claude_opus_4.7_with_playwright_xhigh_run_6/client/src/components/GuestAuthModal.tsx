import { useState, type FormEvent } from "react";

type Props = {
  onSubmit: (name: string) => void;
};

export default function GuestAuthModal({ onSubmit }: Props) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>Join this board</h2>
        <p>Enter a display name so other participants can see who you are.</p>
        <form onSubmit={handleSubmit} className="guest-auth-form">
          <input
            type="text"
            placeholder="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            aria-label="Display name"
            autoFocus
            required
          />
          <button type="submit" disabled={!name.trim()}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
