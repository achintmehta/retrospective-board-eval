import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchBoard, createColumn, exportBoardUrl } from '../api.js';
import { getSocket, emitWithAck } from '../socket.js';
import { useDisplayName } from '../hooks/useDisplayName.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Board from '../components/Board.jsx';
import CardModal from '../components/CardModal.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [displayName, setDisplayName] = useDisplayName();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [openCardId, setOpenCardId] = useState(null);
  const boardRef = useRef(null);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchBoard(boardId);
      setBoard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => {
      setConnected(false);
      setJoined(false);
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!displayName || !boardId || !connected) return;
    let cancelled = false;
    emitWithAck('join_board', { boardId, displayName })
      .then(() => {
        if (!cancelled) {
          setJoined(true);
          loadBoard();
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setJoined(false);
        }
      });
    return () => {
      cancelled = true;
      const socket = getSocket();
      socket.emit('leave_board', { boardId });
    };
  }, [boardId, displayName, connected, loadBoard]);

  useEffect(() => {
    const socket = getSocket();

    const onCardAdded = ({ boardId: targetId, card }) => {
      if (targetId !== boardId) return;
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id && !col.cards.find((c) => c.id === card.id)
              ? { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] }
              : col
          ),
        };
      });
    };

    const onCardMoved = () => {
      // Re-fetch for consistency. Could be optimized with the payload, but
      // refetch guarantees positions match server source-of-truth.
      fetchBoard(boardId).then((data) => setBoard(data)).catch(() => {});
    };

    const onCommentAdded = ({ boardId: targetId, comment }) => {
      if (targetId !== boardId) return;
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === comment.card_id && !card.comments.find((c) => c.id === comment.id)
                ? { ...card, comments: [...card.comments, comment] }
                : card
            ),
          })),
        };
      });
    };

    const onColumnAdded = ({ boardId: targetId, column }) => {
      if (targetId !== boardId) return;
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.find((c) => c.id === column.id)) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: [] }],
        };
      });
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    return () => {
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
    };
  }, [boardId]);

  const handleAddCard = useCallback(
    async (columnId, content) => {
      await emitWithAck('add_card', { boardId, columnId, content });
    },
    [boardId]
  );

  const handleMoveCard = useCallback(
    ({ cardId, sourceColumnId, targetColumnId, targetIndex }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const columns = prev.columns.map((col) => ({ ...col, cards: [...col.cards] }));
        const source = columns.find((c) => c.id === sourceColumnId);
        const target = columns.find((c) => c.id === targetColumnId);
        if (!source || !target) return prev;
        const idx = source.cards.findIndex((c) => c.id === cardId);
        if (idx < 0) return prev;
        const [moved] = source.cards.splice(idx, 1);
        target.cards.splice(targetIndex, 0, moved);
        return { ...prev, columns };
      });

      emitWithAck('move_card', { boardId, cardId, targetColumnId, targetIndex }).catch(
        (err) => {
          setError(err.message);
          fetchBoard(boardId).then((data) => setBoard(data)).catch(() => {});
        }
      );
    },
    [boardId]
  );

  const handleAddColumn = useCallback(
    async (title) => {
      const newColumn = await createColumn(boardId, title);
      setBoard((prev) =>
        prev
          ? { ...prev, columns: [...prev.columns, { ...newColumn, cards: [] }] }
          : prev
      );
      // Refetch to ensure other clients see it (server broadcast not used for columns yet).
    },
    [boardId]
  );

  const handleAddComment = useCallback(
    async (cardId, content) => {
      await emitWithAck('add_comment', { boardId, cardId, content });
    },
    [boardId]
  );

  const openCard = useMemo(() => {
    if (!board || !openCardId) return null;
    for (const col of board.columns) {
      const card = col.cards.find((c) => c.id === openCardId);
      if (card) return card;
    }
    return null;
  }, [board, openCardId]);

  if (!displayName) {
    return (
      <GuestAuthModal
        onSubmit={(name) => {
          setDisplayName(name);
        }}
      />
    );
  }

  return (
    <div className="board-page">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" className="btn btn-ghost btn-sm">← Boards</Link>
          <h1>{board?.title || (loading ? 'Loading…' : 'Board')}</h1>
        </div>
        <div className="header-actions">
          <span
            className={`connection-status ${connected && joined ? 'connected' : 'disconnected'}`}
            title={connected ? (joined ? 'Live' : 'Joining…') : 'Reconnecting…'}
          >
            {connected ? (joined ? 'Live' : 'Joining…') : 'Reconnecting…'}
          </span>
          <span className="author-pill" title="Your display name">
            {displayName}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setDisplayName('')}
            title="Change display name"
          >
            Change name
          </button>
          {board && (
            <a className="btn btn-sm" href={exportBoardUrl(boardId)}>
              Export CSV
            </a>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      {loading && !board ? (
        <p className="loading-state">Loading board…</p>
      ) : board ? (
        <Board
          board={board}
          onAddCard={handleAddCard}
          onMoveCard={handleMoveCard}
          onAddColumn={handleAddColumn}
          onOpenCard={(id) => setOpenCardId(id)}
        />
      ) : (
        <p className="loading-state">Board not found.</p>
      )}

      {openCard && (
        <CardModal
          card={openCard}
          displayName={displayName}
          onClose={() => setOpenCardId(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}
