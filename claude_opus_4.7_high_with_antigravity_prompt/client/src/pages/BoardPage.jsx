import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners
} from '@dnd-kit/core';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import { getDisplayName, setDisplayName } from '../lib/guestSession.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';
import { CardOverlay } from '../components/Card.jsx';

export default function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState(getDisplayName());
  const [connected, setConnected] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getBoard(id)
      .then((data) => {
        if (cancelled) return;
        setBoard({ id: data.id, title: data.title, created_at: data.created_at });
        setColumns(data.columns);
        setCards(data.cards);
        setComments(data.comments);
      })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!name || !board) return;
    const socket = getSocket();
    socketRef.current = socket;

    function handleConnect() {
      setConnected(true);
      socket.emit('join_board', { boardId: id, displayName: name }, (resp) => {
        if (!resp?.ok) {
          setError(resp?.error || 'Failed to join board');
          return;
        }
        // Refresh local state from authoritative server snapshot
        setColumns(resp.board.columns);
        setCards(resp.board.cards);
        setComments(resp.board.comments);
      });
    }

    function handleDisconnect() { setConnected(false); }

    function handleCardAdded({ card }) {
      setCards((prev) => (prev.some((c) => c.id === card.id) ? prev : [...prev, card]));
    }

    function handleCardMoved({ card }) {
      setCards((prev) => {
        const others = prev.filter((c) => c.id !== card.id);
        return [...others, card];
      });
    }

    function handleCommentAdded({ comment }) {
      setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
    }

    if (socket.connected) handleConnect();
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('card_added', handleCardAdded);
    socket.on('card_moved', handleCardMoved);
    socket.on('comment_added', handleCommentAdded);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('card_added', handleCardAdded);
      socket.off('card_moved', handleCardMoved);
      socket.off('comment_added', handleCommentAdded);
    };
  }, [id, name, board]);

  // Derived data
  const cardsByColumn = useMemo(() => {
    const map = {};
    for (const col of columns) map[col.id] = [];
    for (const card of cards) {
      if (!map[card.column_id]) map[card.column_id] = [];
      map[card.column_id].push(card);
    }
    for (const colId of Object.keys(map)) {
      map[colId].sort((a, b) => a.position - b.position || a.created_at - b.created_at);
    }
    return map;
  }, [columns, cards]);

  const commentsByCard = useMemo(() => {
    const map = {};
    for (const cm of comments) {
      if (!map[cm.card_id]) map[cm.card_id] = [];
      map[cm.card_id].push(cm);
    }
    for (const cardId of Object.keys(map)) {
      map[cardId].sort((a, b) => a.created_at - b.created_at);
    }
    return map;
  }, [comments]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleAddCard(columnId, content) {
    socketRef.current?.emit('add_card', { columnId, content });
  }

  function handleAddComment(cardId, content) {
    socketRef.current?.emit('add_comment', { cardId, content });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    try {
      const column = await api.addColumn(id, trimmed);
      setColumns((prev) => [...prev, column]);
      setNewColumnTitle('');
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDragStart(event) {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    if (card) setActiveCard(card);
  }

  function handleDragEnd(event) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;
    const card = cards.find((c) => c.id === active.id);
    if (!card) return;

    // Resolve target column + index
    let targetColumnId;
    let targetIndex;

    if (over.data.current?.type === 'column') {
      targetColumnId = over.data.current.columnId;
      targetIndex = (cardsByColumn[targetColumnId] || []).length;
      if (card.column_id === targetColumnId) {
        // Dropped on own column container — keep at end
        targetIndex = (cardsByColumn[targetColumnId] || []).filter((c) => c.id !== card.id).length;
      }
    } else if (over.data.current?.type === 'card') {
      const overCard = over.data.current.card;
      targetColumnId = overCard.column_id;
      const colCards = (cardsByColumn[targetColumnId] || []).filter((c) => c.id !== card.id);
      targetIndex = colCards.findIndex((c) => c.id === overCard.id);
      if (targetIndex < 0) targetIndex = colCards.length;
    } else {
      return;
    }

    // Optimistic update: insert into the target list locally
    setCards((prev) => {
      const others = prev.filter((c) => c.id !== card.id);
      const peers = others
        .filter((c) => c.column_id === targetColumnId)
        .sort((a, b) => a.position - b.position || a.created_at - b.created_at);
      const safeIndex = Math.max(0, Math.min(targetIndex, peers.length));
      peers.splice(safeIndex, 0, { ...card, column_id: targetColumnId });
      const reindexed = peers.map((c, idx) => ({ ...c, position: idx + 1 }));
      const otherCols = others.filter((c) => c.column_id !== targetColumnId);
      return [...otherCols, ...reindexed];
    });

    socketRef.current?.emit('move_card', {
      cardId: card.id,
      targetColumnId,
      targetIndex
    });
  }

  function handleExport() {
    window.open(api.exportUrl(id), '_blank');
  }

  function handleGuestSubmit(displayName) {
    setDisplayName(displayName);
    setName(displayName);
  }

  if (loading) {
    return <div className="loader-block"><div className="loader" /></div>;
  }

  if (error && !board) {
    return (
      <div className="main-page">
        <div className="banner banner--error">{error}</div>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: 16 }}>← Back to boards</Link>
      </div>
    );
  }

  return (
    <div className="board-page">
      {!name && <GuestAuthModal onSubmit={handleGuestSubmit} />}

      <div className="board-toolbar">
        <div className="board-title-block">
          <h1 className="board-page-title">{board?.title}</h1>
          <div className="board-page-sub">Board ID: {board?.id} · Share this URL with your team to collaborate</div>
        </div>
        <div className="board-toolbar-actions">
          <div className="presence" title={connected ? 'Live' : 'Disconnected'}>
            <span className={`presence-dot ${connected ? '' : 'disconnected'}`} />
            {connected ? 'Live' : 'Reconnecting…'}
            {name && <span style={{ color: 'var(--text-2)' }}>· {name}</span>}
          </div>
          <button className="btn btn-secondary" onClick={handleExport} type="button">
            ⬇ Export CSV
          </button>
          <Link to="/" className="btn btn-ghost">← All boards</Link>
        </div>
      </div>

      {error && <div className="banner banner--error" style={{ margin: '12px 32px' }}>{error}</div>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCard(null)}
      >
        <div className="columns-scroll">
          <div className="columns-container">
            {columns.map((col) => (
              <Column
                key={col.id}
                column={col}
                cards={cardsByColumn[col.id] || []}
                commentsByCard={commentsByCard}
                onAddCard={handleAddCard}
                onAddComment={handleAddComment}
              />
            ))}
            <form className="add-column" onSubmit={handleAddColumn}>
              <h3>Add a column</h3>
              <input
                className="input"
                placeholder="e.g. Kudos"
                value={newColumnTitle}
                maxLength={60}
                onChange={(e) => setNewColumnTitle(e.target.value)}
              />
              <button className="btn btn-secondary" type="submit" disabled={!newColumnTitle.trim()}>
                + Add column
              </button>
            </form>
          </div>
        </div>
        <DragOverlay>{activeCard ? <CardOverlay card={activeCard} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
