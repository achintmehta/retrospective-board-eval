const LABELS = {
  connecting: 'Connecting…',
  connected: 'Live',
  disconnected: 'Reconnecting…',
};

export default function ConnectionStatus({ status }) {
  return (
    <span
      className={`connection-status connection-status--${status}`}
      id="connection-status"
      role="status"
      aria-live="polite"
    >
      <span className="connection-dot" aria-hidden="true" />
      {LABELS[status] || status}
    </span>
  );
}
