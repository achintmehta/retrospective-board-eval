import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api.js';
import { getSocket } from '../socket.js';
import { initials, useDisplayName } from '../useDisplayName.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const { name: displayName, setName: setDisplayName } = useDisplayName();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(1);
  const [toast, setToast] = useState('');
  const [newColumnDraft, setNewColumnDraft] = useState('');
  const [showColumnInput, setShowColumnInput] = useState(false);
  const socketRef = useRef(null);
  const joinedRef = useRef(false);

  // Fetch board data
  useEffect(() => {
    let mounted = true;
    api.getBoard(boardId)
      .then((data) => { if (mounted) setBoard(data); })
      .catch((err) => { if (mounted) setError(err.message || 'Failed to load board'); });
    return () => { mounted = false; };
  }, [boardId]);

  // Socket connection + room join
  useEffect(() => {
    if (!displayName || !board) return;
    const socket = getSocket();
    socketRef.current = socket;

    const handleConnect = () => {
      setConnected(true);
      socket.emit('join_board', { boardId, displayName }, (ack) => {
        if (ack?.ok) {
          joinedRef.current = true;
          setPeerCount(ack.peerCount || 1);
        }
      });
    };

    const handleDisconnect = () => {
      setConnected(false);
      joinedRef.current = false;
    };

    const handleCardAdded = ({ card }) => {
      if (!card) return;
      setBoard((prev) => {
        if (!prev) return prev;
        const columns = prev.columns.map((col) => {
          if (col.id !== card.column_id) return col;
          if (col.cards.some((c) => c.id === card.id)) return col;
          const nextCards = [...col.cards, { ...card, comments: card.comments || [] }];
          nextCards.sort((a, b) => a.position - b.position);
          return { ...col, cards: nextCards };
        });
        return { ...prev, columns };
      });
    };

    const handleCardMoved = ({ cardId, toColumnId, toIndex }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let moving = null;
        const stripped = prev.columns.map((col) => {
          const next = col.cards.filter((c) => {
            if (c.id === cardId) { moving = c; return false; }
            return true;
          });
          return { ...col, cards: next };
        });
        if (!moving) return prev;
        const target = stripped.map((col) => {
          if (col.id !== toColumnId) return col;
          const insertIdx = Math.max(0, Math.min(toIndex ?? col.cards.length, col.cards.length));
          const nextCards = [...col.cards];
          nextCards.splice(insertIdx, 0, { ...moving, column_id: toColumnId });
          return { ...col, cards: nextCards };
        });
        return { ...prev, columns: target };
      });
    };

    const handleCommentAdded = ({ comment }) => {
      if (!comment) return;
      setBoard((prev) => {
        if (!prev) return prev;
        const columns = prev.columns.map((col) => {
          const cards = col.cards.map((card) => {
            if (card.id !== comment.card_id) return card;
            if ((card.comments || []).some((c) => c.id === comment.id)) return card;
            return { ...card, comments: [...(card.comments || []), comment] };
          });
          return { ...col, cards };
        });
        return { ...prev, columns };
      });
    };

    const handlePresence = ({ boardId: bId, peerCount: p }) => {
      if (bId === boardId) setPeerCount(p);
    };

    const handlePeerJoined = ({ displayName: dn }) => {
      if (dn) flashToast(`${dn} joined`);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('card_added', handleCardAdded);
    socket.on('card_moved', handleCardMoved);
    socket.on('comment_added', handleCommentAdded);
    socket.on('presence_update', handlePresence);
    socket.on('peer_joined', handlePeerJoined);

    if (socket.connected) handleConnect();

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('card_added', handleCardAdded);
      socket.off('card_moved', handleCardMoved);
      socket.off('comment_added', handleCommentAdded);
      socket.off('presence_update', handlePresence);
      socket.off('peer_joined', handlePeerJoined);
      if (joinedRef.current) {
        socket.emit('leave_board', { boardId });
        joinedRef.current = false;
      }
    };
  }, [boardId, displayName, board?.id]);

  const flashToastRef = useRef();
  function flashToast(message) {
    setToast(message);
    clearTimeout(flashToastRef.current);
    flashToastRef.current = setTimeout(() => setToast(''), 2200);
  }

  function handleAddCard(columnId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_card', { columnId, content, authorName: displayName });
  }

  function handleAddComment(cardId, content) {
    const socket = socketRef.current;
    if (!socket) return;
    socket.emit('add_comment', { cardId, content, authorName: displayName });
  }

  function handleDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    setBoard((prev) => {
      if (!prev) return prev;
      let moving = null;
      const next = prev.columns.map((col) => {
        const cards = col.cards.filter((c) => {
          if (c.id === draggableId) { moving = c; return false; }
          return true;
        });
        return { ...col, cards };
      });
      if (!moving) return prev;
      const placed = next.map((col) => {
        if (col.id !== destination.droppableId) return col;
        const cards = [...col.cards];
        cards.splice(destination.index, 0, { ...moving, column_id: destination.droppableId });
        return { ...col, cards };
      });
      return { ...prev, columns: placed };
    });

    const socket = socketRef.current;
    if (socket) {
      socket.emit('move_card', {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toIndex: destination.index,
      });
    }
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const t = newColumnDraft.trim();
    if (!t) return;
    try {
      const column = await api.createColumn(boardId, t);
      setBoard((prev) => prev ? { ...prev, columns: [...prev.columns, { ...column, cards: [] }] } : prev);
      setNewColumnDraft('');
      setShowColumnInput(false);
    } catch (err) {
      flashToast(err.message || 'Failed to add column');
    }
  }

  const sortedColumns = useMemo(
    () => (board ? [...board.columns].sort((a, b) => a.position - b.position) : []),
    [board],
  );

  if (error) {
    return (
      <div className="empty-state">
        <strong style={{ color: 'var(--c-text)' }}>{error}</strong>
        <Link to="/" className="btn btn-primary">Back to boards</Link>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="board-grid" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 280 }} />
        ))}
      </div>
    );
  }

  if (!displayName) {
    return <GuestAuthModal onSubmit={setDisplayName} />;
  }

  return (
    <>
      <header className="board-header">
        <div className="board-title">
          <div className="crumb">
            <Link to="/" className="text-dim">Boards</Link>
            <span aria-hidden="true">/</span>
            <span className="mono" style={{ fontSize: '0.78rem' }}>{board.id.slice(0, 8)}</span>
          </div>
          <h1>{board.title}</h1>
        </div>
        <div className="board-actions">
          <div className="presence" title={`${peerCount} connected`}>
            <div className="avatars" aria-hidden="true">
              <div className="avatar">{initials(displayName)}</div>
              {peerCount > 1 && <div className="avatar" style={{ background: 'linear-gradient(135deg,#22d3ee,#7c3aed)' }}>+{Math.max(0, peerCount - 1)}</div>}
            </div>
            <span className={`dot ${connected ? 'ok' : ''}`} aria-hidden="true" />
            <span>{connected ? `Live · ${peerCount}` : 'Connecting…'}</span>
          </div>
          <a
            className="btn btn-ghost btn-sm"
            href={api.exportUrl(board.id)}
            target="_blank"
            rel="noreferrer"
          >
            <DownloadIcon /> Export CSV
          </a>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {sortedColumns.map((column) => (
            <Column
              key={column.id}
              column={column}
              displayName={displayName}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}

          <div className="add-column">
            <div className="column-title text-dim" style={{ fontSize: '0.88rem' }}>New column</div>
            {showColumnInput ? (
              <form onSubmit={handleAddColumn} className="add-card-form">
                <input
                  className="input"
                  autoFocus
                  value={newColumnDraft}
                  onChange={(e) => setNewColumnDraft(e.target.value)}
                  placeholder="e.g. Kudos"
                  maxLength={80}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setShowColumnInput(false); setNewColumnDraft(''); } }}
                />
                <div className="row">
                  <button className="btn btn-primary btn-sm" type="submit" disabled={!newColumnDraft.trim()}>
                    Add column
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setShowColumnInput(false); setNewColumnDraft(''); }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowColumnInput(true)}
              >
                + Add column
              </button>
            )}
          </div>
        </div>
      </DragDropContext>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
    </svg>
  );
}
