import { useRef, useState } from 'react';
import { avatarGradient, fullDate, initials, timeAgo } from '../lib/format.js';

export default function CommentList({ cardId, comments, onAddComment }) {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef(null);

  async function submit(e) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onAddComment(cardId, trimmed);
      setValue('');
      ref.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      submit(e);
    }
  }

  return (
    <div className="comments" id={`comments-${cardId}`}>
      {comments.map((c) => (
        <div className="comment" key={c.id}>
          <span
            className="avatar"
            style={{ '--avatar-grad': avatarGradient(c.authorName) }}
            aria-hidden="true"
          >
            {initials(c.authorName)}
          </span>
          <div>
            <div className="comment-meta">
              <strong>{c.authorName}</strong>
              <span>·</span>
              <span title={fullDate(c.createdAt)}>{timeAgo(c.createdAt)}</span>
            </div>
            <div className="comment-body">{c.content}</div>
          </div>
        </div>
      ))}
      <form className="comment-form" onSubmit={submit}>
        <textarea
          ref={ref}
          className="textarea"
          placeholder="Reply… (⌘/Ctrl+Enter to send)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={2000}
          aria-label="Add a comment"
          id={`comment-input-${cardId}`}
        />
        <button
          type="submit"
          className="btn btn-sm btn-primary"
          disabled={!value.trim() || submitting}
          id={`comment-submit-${cardId}`}
        >
          {submitting ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
