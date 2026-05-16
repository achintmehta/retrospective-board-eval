export default function CommentList({ comments }) {
  if (!comments || comments.length === 0) {
    return <p className="muted small">No comments yet.</p>;
  }
  return (
    <ul className="comment-list">
      {comments.map((c) => (
        <li key={c.id} className="comment">
          <span className="comment-author">{c.author_name}</span>
          <span className="comment-content">{c.content}</span>
        </li>
      ))}
    </ul>
  );
}
