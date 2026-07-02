import type { ConnectionStatus } from '../hooks/useBoardSocket';
import './ConnectionPill.css';

interface ConnectionPillProps {
  status: ConnectionStatus;
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: 'Connecting…',
  connected: 'Live',
  reconnecting: 'Reconnecting…',
  error: 'Offline',
};

export default function ConnectionPill({ status }: ConnectionPillProps) {
  return (
    <span className={`connection-pill status-${status}`} role="status" aria-live="polite">
      <span className="connection-dot" aria-hidden />
      <span>{STATUS_LABEL[status]}</span>
    </span>
  );
}
