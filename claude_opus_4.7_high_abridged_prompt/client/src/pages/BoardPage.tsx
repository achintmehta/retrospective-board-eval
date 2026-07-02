import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import { api } from '../api';
import { getSocket } from '../socket';
import type { BoardColumn, Card, Comment, FullBoard } from '../types';
import NameModal from '../components/NameModal';
import CommentsDrawer from '../components/CommentsDrawer';

const NAME_KEY = 'retro:displayName';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<FullBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(
    () => sessionStorage.getItem(NAME_KEY)
  );
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [composerFor, setComposerFor] = useState<string | null>(null);
  const [composerText, setComposerText] = useState('');
  const socketRef = useRef(getSocket());

  // Fetch board
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .getBoard(id)
      .then((b) => {
        if (!cancelled) setBoard(b);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Socket connection + join room + event handlers
  useEffect(() => {
    if (!id || !displayName) return;
    const socket = socketRef.current;

    const handleConnect = () => {
      setConnected(true);
      socket.emit('join_board', { boardId: id, name: displayName });
      // On reconnect, refetch full state to avoid drift
      api.getBoard(id).then(setBoard).catch(() => {});
    };
    const handleDisconnect = () => setConnected(false);

    const onCardAdded = (card: Card) => {
      setBoard((b) => {
        if (!b) return b;
        if (b.cards.some((c) => c.id === card.id)) return b;
        return { ...b, cards: [...b.cards, card] };
      });
    };
    const onCardMoved = ({
      card,
    }: {
      card: Card;
      fromColumnId: string;
      toColumnId: string;
      toPosition: number;
    }) => {
      setBoard((b) => {
        if (!b) return b;
        // Refetch is safest given position bookkeeping — but do a local update to feel snappy.
        const others = b.cards.filter((c) => c.id !== card.id);
        return { ...b, cards: [...others, card] };
      });
      // Reconcile positions with server to avoid drift.
      if (id) api.getBoard(id).then(setBoard).catch(() => {});
    };
    const onCommentAdded = (comment: Comment) => {
      setBoard((b) => {
        if (!b) return b;
        if (b.comments.some((c) => c.id === comment.id)) return b;
        return { ...b, comments: [...b.comments, comment] };
      });
    };
    const onColumnAdded = (column: BoardColumn) => {
      setBoard((b) => {
        if (!b) return b;
        if (b.columns.some((c) => c.id === column.id)) return b;
        return { ...b, columns: [...b.columns, column] };
      });
    };

    if (socket.connected) handleConnect();
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
    };
  }, [id, displayName]);

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, Card[]>();
    if (!board) return map;
    for (const col of board.columns) map.set(col.id, []);
    const sorted = [...board.cards].sort((a, b) => a.position - b.position);
    for (const c of sorted) {
      const arr = map.get(c.column_id);
      if (arr) arr.push(c);
    }
    return map;
  }, [board]);

  const commentsByCard = useMemo(() => {
    const map = new Map<string, Comment[]>();
    if (!board) return map;
    for (const c of board.comments) {
      if (!map.has(c.card_id)) map.set(c.card_id, []);
      map.get(c.card_id)!.push(c);
    }
    for (const list of map.values()) list.sort((a, b) => a.created_at - b.created_at);
    return map;
  }, [board]);

  const setName = (name: string) => {
    sessionStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
  };

  const addCard = useCallback(
    (columnId: string, content: string) => {
      const socket = socketRef.current;
      socket.emit('add_card', { columnId, content }, (resp: { ok: boolean; error?: string }) => {
        if (!resp?.ok) setError(resp?.error || 'Failed to add card');
      });
    },
    []
  );

  const addComment = useCallback((cardId: string, content: string) => {
    const socket = socketRef.current;
    socket.emit('add_comment', { cardId, content }, (resp: { ok: boolean; error?: string }) => {
      if (!resp?.ok) setError(resp?.error || 'Failed to add comment');
    });
  }, []);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }
      // Optimistic local move
      setBoard((b) => {
        if (!b) return b;
        const sorted = [...b.cards].sort((a, b2) => a.position - b2.position);
        const byCol = new Map<string, Card[]>();
        for (const col of b.columns) byCol.set(col.id, []);
        for (const c of sorted) {
          const arr = byCol.get(c.column_id);
          if (arr) arr.push(c);
        }
        const fromArr = byCol.get(source.droppableId) || [];
        const idx = fromArr.findIndex((c) => c.id === draggableId);
        if (idx === -1) return b;
        const [moved] = fromArr.splice(idx, 1);
        const toArr = byCol.get(destination.droppableId) || [];
        toArr.splice(destination.index, 0, {
          ...moved,
          column_id: destination.droppableId,
        });
        const newCards: Card[] = [];
        for (const [colId, list] of byCol.entries()) {
          list.forEach((c, i) => {
            newCards.push({ ...c, column_id: colId, position: i });
          });
        }
        return { ...b, cards: newCards };
      });
      const socket = socketRef.current;
      socket.emit('move_card', {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toPosition: destination.index,
      });
    },
    []
  );

  const addColumn = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const t = newColumnTitle.trim();
    if (!t) return;
    try {
      await api.createColumn(id, t);
      setNewColumnTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add column');
    }
  };

  if (!id) return <div className="center-status">Board not found.</div>;

  if (!displayName) return <NameModal onSubmit={setName} />;

  if (error && !board) {
    return <div className="center-status">Error: {error}</div>;
  }
  if (!board) {
    return (
      <div className="center-status">
        <div className="spinner" />
        <div>Loading board…</div>
      </div>
    );
  }

  const openCard = openCardId
    ? board.cards.find((c) => c.id === openCardId) || null
    : null;

  return (
    <div className="board-page">
      <div className="board-header">
        <div className="board-title-row">
          <h1>{board.title}</h1>
          <div className="subtitle">
            You are joined as <b>{displayName}</b> ·{' '}
            <button
              className="btn-ghost"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-dim)',
                padding: 0,
                textDecoration: 'underline dotted',
              }}
              onClick={() => {
                sessionStorage.removeItem(NAME_KEY);
                setDisplayName(null);
              }}
            >
              change name
            </button>
          </div>
        </div>
        <div className="board-actions">
          <span
            className={`presence-chip ${connected ? '' : 'disconnected'}`}
            title={connected ? 'Live sync active' : 'Reconnecting…'}
          >
            <span className="dot" />
            {connected ? 'Live' : 'Reconnecting'}
          </span>
          <a
            className="btn"
            href={api.exportUrl(board.id)}
            download
            title="Export board contents as CSV"
          >
            ⬇ Export CSV
          </a>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="columns">
          {board.columns
            .slice()
            .sort((a, b) => a.position - b.position)
            .map((col) => {
              const cards = cardsByColumn.get(col.id) || [];
              return (
                <Droppable droppableId={col.id} key={col.id}>
                  {(dropProvided, dropSnapshot) => (
                    <section
                      className={`column ${
                        dropSnapshot.isDraggingOver ? 'is-dragging-over' : ''
                      }`}
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                    >
                      <div className="column-header">
                        <div className="column-title">
                          <span className="column-swatch" aria-hidden />
                          {col.title}
                        </div>
                        <span className="column-count">{cards.length}</span>
                      </div>
                      <div className="column-cards">
                        {cards.map((card, index) => {
                          const cCount = commentsByCard.get(card.id)?.length || 0;
                          return (
                            <Draggable
                              draggableId={card.id}
                              index={index}
                              key={card.id}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  className={`card ${
                                    dragSnapshot.isDragging ? 'is-dragging' : ''
                                  }`}
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                >
                                  <div className="card-content">{card.content}</div>
                                  <div className="card-meta">
                                    <span className="card-author">
                                      <span className="avatar">
                                        {initials(card.author_name)}
                                      </span>
                                      {card.author_name}
                                    </span>
                                    <button
                                      className="card-comments-btn"
                                      onClick={() => setOpenCardId(card.id)}
                                    >
                                      💬 {cCount}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {dropProvided.placeholder}
                      </div>

                      {composerFor === col.id ? (
                        <form
                          className="composer"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const t = composerText.trim();
                            if (!t) return;
                            addCard(col.id, t);
                            setComposerText('');
                            setComposerFor(null);
                          }}
                        >
                          <textarea
                            className="textarea"
                            placeholder="What's on your mind?"
                            value={composerText}
                            onChange={(e) => setComposerText(e.target.value)}
                            maxLength={2000}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setComposerFor(null);
                                setComposerText('');
                              }
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                const t = composerText.trim();
                                if (!t) return;
                                addCard(col.id, t);
                                setComposerText('');
                                setComposerFor(null);
                              }
                            }}
                          />
                          <div className="composer-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setComposerFor(null);
                                setComposerText('');
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm"
                              disabled={!composerText.trim()}
                            >
                              Add card
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          className="btn btn-ghost"
                          onClick={() => setComposerFor(col.id)}
                        >
                          + Add a card
                        </button>
                      )}
                    </section>
                  )}
                </Droppable>
              );
            })}

          {/* Add column tile */}
          <form className="column-column-form" onSubmit={addColumn}>
            <label className="form-label">Add a column</label>
            <input
              className="input"
              placeholder="e.g. Kudos"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              maxLength={60}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!newColumnTitle.trim()}
            >
              + Add column
            </button>
          </form>
        </div>
      </DragDropContext>

      {openCard && (
        <CommentsDrawer
          card={openCard}
          comments={commentsByCard.get(openCard.id) || []}
          onClose={() => setOpenCardId(null)}
          onAdd={(content) => addComment(openCard.id, content)}
        />
      )}
    </div>
  );
}
