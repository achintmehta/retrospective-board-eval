import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { api, BoardWithChildren, Card, Comment, BoardColumn } from '../api';
import { getSocket } from '../socket';
import { getDisplayName, setDisplayName } from '../session';
import GuestModal from '../components/GuestModal';
import Column from '../components/Column';
import CommentDrawer from '../components/CommentDrawer';

type FullCard = Card & { comments: Comment[] };
type FullColumn = BoardColumn & { cards: FullCard[] };

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<BoardWithChildren | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setName] = useState<string | null>(getDisplayName());
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    if (!boardId) return;
    let alive = true;
    setLoading(true);
    api
      .getBoard(boardId)
      .then((data) => alive && setBoard(data))
      .catch((e) => alive && setError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [boardId]);

  useEffect(() => {
    if (!boardId || !displayName) return;
    const socket = socketRef.current;
    const join = () => socket.emit('join_board', { boardId, displayName });

    const handleConnect = () => {
      setConnected(true);
      join();
      api.getBoard(boardId).then((data) => setBoard(data)).catch(() => {});
    };
    const handleDisconnect = () => setConnected(false);

    if (socket.connected) {
      setConnected(true);
      join();
    }
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const handleCardAdded = ({ card }: { card: Card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id && !col.cards.some((c) => c.id === card.id)
              ? { ...col, cards: [...col.cards, { ...card, comments: [] }] }
              : col
          ),
        };
      });
    };

    const handleCardMoved = ({
      cardId,
      toColumnId,
      newPosition,
    }: {
      cardId: string;
      toColumnId: string;
      newPosition: number;
    }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let moving: FullCard | null = null;
        const withoutCard = prev.columns.map((col) => {
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx === -1) return col;
          moving = col.cards[idx];
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
        });
        if (!moving) return prev;
        const inserted = withoutCard.map((col) => {
          if (col.id !== toColumnId) return col;
          const cards = [...col.cards];
          const pos = Math.min(Math.max(newPosition, 0), cards.length);
          cards.splice(pos, 0, { ...moving!, column_id: toColumnId, position: pos });
          return { ...col, cards };
        });
        return { ...prev, columns: inserted };
      });
    };

    const handleCommentAdded = ({ comment }: { comment: Comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === comment.card_id &&
              !card.comments.some((c) => c.id === comment.id)
                ? { ...card, comments: [...card.comments, comment] }
                : card
            ),
          })),
        };
      });
    };

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
  }, [boardId, displayName]);

  function handleAddCard(columnId: string, content: string) {
    if (!boardId || !displayName) return;
    socketRef.current.emit('add_card', {
      boardId,
      columnId,
      content,
      authorName: displayName,
    });
  }

  function handleAddComment(cardId: string, content: string) {
    if (!boardId || !displayName) return;
    socketRef.current.emit('add_comment', {
      boardId,
      cardId,
      content,
      authorName: displayName,
    });
  }

  function handleDragEnd(result: DropResult) {
    if (!board || !boardId) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    setBoard((prev) => {
      if (!prev) return prev;
      let moving: FullCard | null = null;
      const withoutCard = prev.columns.map((col) => {
        if (col.id !== source.droppableId) return col;
        const cards = [...col.cards];
        const [taken] = cards.splice(source.index, 1);
        moving = taken;
        return { ...col, cards };
      });
      if (!moving) return prev;
      const inserted = withoutCard.map((col) => {
        if (col.id !== destination.droppableId) return col;
        const cards = [...col.cards];
        cards.splice(destination.index, 0, {
          ...moving!,
          column_id: destination.droppableId,
          position: destination.index,
        });
        return { ...col, cards };
      });
      return { ...prev, columns: inserted };
    });

    socketRef.current.emit('move_card', {
      boardId,
      cardId: draggableId,
      toColumnId: destination.droppableId,
      newPosition: destination.index,
    });
  }

  async function handleAddColumn(e: FormEvent) {
    e.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed || !boardId) return;
    try {
      const col = await api.createColumn(boardId, trimmed);
      setBoard((prev) =>
        prev ? { ...prev, columns: [...prev.columns, { ...col, cards: [] }] } : prev
      );
      setNewColumnTitle('');
      setShowColumnForm(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      // ignore
    }
  }

  const selectedCard = useMemo(() => {
    if (!board || !selectedCardId) return null;
    for (const col of board.columns) {
      const c = col.cards.find((c) => c.id === selectedCardId);
      if (c) return { ...c, columnTitle: col.title };
    }
    return null;
  }, [board, selectedCardId]);

  if (!displayName) {
    return (
      <GuestModal
        onSubmit={(name) => {
          setDisplayName(name);
          setName(name);
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="board-loading">
        <div className="spinner" />
        <p>Loading board…</p>
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="empty-state">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <Link to="/" className="btn btn-primary">Back to boards</Link>
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div className="board-toolbar-left">
          <Link to="/" className="btn btn-ghost btn-back">← All boards</Link>
          <div className="board-heading">
            <h1>{board.title}</h1>
            <div className="board-meta">
              <span className={`status-dot ${connected ? 'online' : 'offline'}`} />
              <span className="board-meta-text">
                {connected ? 'Live' : 'Reconnecting…'} · joined as {displayName}
              </span>
            </div>
          </div>
        </div>
        <div className="board-toolbar-right">
          <button className="btn btn-ghost" onClick={handleCopyLink}>
            {copyState === 'copied' ? '✓ Copied' : '🔗 Share'}
          </button>
          <a
            className="btn btn-ghost"
            href={api.exportUrl(board.id)}
            download
          >
            ⬇ Export CSV
          </a>
          <button
            className="btn btn-primary"
            onClick={() => setShowColumnForm((s) => !s)}
          >
            + Column
          </button>
        </div>
      </div>

      {showColumnForm && (
        <form onSubmit={handleAddColumn} className="new-column-form">
          <input
            className="input"
            autoFocus
            placeholder="Column title (e.g. Action Items)"
            maxLength={60}
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!newColumnTitle.trim()}>
            Create
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setShowColumnForm(false);
              setNewColumnTitle('');
            }}
          >
            Cancel
          </button>
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {board.columns.map((col, i) => (
            <Column
              key={col.id}
              column={col as FullColumn}
              index={i}
              onAddCard={handleAddCard}
              onOpenCard={setSelectedCardId}
            />
          ))}
        </div>
      </DragDropContext>

      {selectedCard && (
        <CommentDrawer
          card={selectedCard}
          onClose={() => setSelectedCardId(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}
