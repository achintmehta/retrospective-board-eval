import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
} from '@hello-pangea/dnd';
import { api } from '../lib/api.js';
import { getSocket } from '../lib/socket.js';
import {
  getDisplayName,
  setDisplayName,
  avatarGradient,
  initials,
  formatRelative,
} from '../lib/identity.js';
import { useToast } from '../components/Toast.jsx';
import GuestModal from '../components/GuestModal.jsx';
import CardDetailsModal from '../components/CardDetailsModal.jsx';

function AddCardForm({ columnId, onSubmit }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const textRef = useRef(null);

  useEffect(() => {
    if (open) textRef.current?.focus();
  }, [open]);

  const submit = (event) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    onSubmit(clean);
    setText('');
    // keep the form open — quick capture
    textRef.current?.focus();
  };

  if (!open) {
    return (
      <button type="button" className="add-card-trigger" onClick={() => setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        Add a card
      </button>
    );
  }

  return (
    <form className="add-card-form" onSubmit={submit}>
      <textarea
        ref={textRef}
        className="textarea"
        placeholder="What's on your mind?"
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={2000}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            submit(event);
          } else if (event.key === 'Escape') {
            setOpen(false);
            setText('');
          }
        }}
      />
      <div className="add-card-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => { setOpen(false); setText(''); }}
        >
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim()}>
          Add card
        </button>
      </div>
    </form>
  );
}

function CardView({ card, commentCount, index, onOpen }) {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`card${snapshot.isDragging ? ' is-dragging' : ''}`}
          style={provided.draggableProps.style}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-footer">
            <span className="card-author">
              <span className="card-mini-avatar" style={{ background: avatarGradient(card.authorName) }}>
                {initials(card.authorName)}
              </span>
              <span>{card.authorName}</span>
            </span>
            <button
              type="button"
              className={`card-comment-btn${commentCount ? ' active' : ''}`}
              onClick={(event) => { event.stopPropagation(); onOpen(card); }}
              aria-label={`Open comments (${commentCount})`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              {commentCount}
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}

function AddColumn({ onSubmit }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (event) => {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onSubmit(clean);
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="add-column" style={{ minHeight: 60 }} onClick={() => setOpen(true)}>
        <span className="add-card-trigger" style={{ border: 'none', background: 'transparent' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          Add column
        </span>
      </button>
    );
  }
  return (
    <form className="add-column" onSubmit={submit}>
      <input
        ref={inputRef}
        className="input"
        placeholder="Column title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={60}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); setTitle(''); }
        }}
      />
      <div className="add-card-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setOpen(false); setTitle(''); }}>Cancel</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!title.trim()}>Add</button>
      </div>
    </form>
  );
}

export default function BoardPage() {
  const { id: boardId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [board, setBoard] = useState(null);
  const [cards, setCards] = useState([]);
  const [comments, setComments] = useState([]);
  const [presence, setPresence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayName, setName] = useState(getDisplayName());
  const [joined, setJoined] = useState(false);
  const [openCardId, setOpenCardId] = useState(null);

  const socketRef = useRef(null);

  // Fetch board data
  const loadBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(boardId);
      setBoard({ id: data.id, title: data.title, columns: data.columns, createdAt: data.createdAt });
      setCards(data.cards);
      setComments(data.comments);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [boardId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadBoard().then((data) => {
      if (!alive) return;
      if (!data) toast.error('Could not load board');
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [loadBoard, toast]);

  // Socket wiring — subscribe on mount, join once we have a display name.
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onCardAdded = ({ card }) => {
      setCards((current) => (current.some((c) => c.id === card.id) ? current : [...current, card]));
    };
    const onCardMoved = ({ card }) => {
      setCards((current) =>
        current.map((c) =>
          c.id === card.id
            ? { ...c, columnId: card.toColumnId, position: card.position }
            : c,
        ),
      );
    };
    const onCommentAdded = ({ comment }) => {
      setComments((current) => (current.some((c) => c.id === comment.id) ? current : [...current, comment]));
    };
    const onColumnAdded = ({ column }) => {
      setBoard((current) => {
        if (!current) return current;
        if (current.columns.some((c) => c.id === column.id)) return current;
        return { ...current, columns: [...current.columns, column] };
      });
    };
    const onPresence = ({ users }) => {
      // De-duplicate users by displayName so the same person from multiple tabs shows once.
      const seen = new Map();
      for (const u of users) if (!seen.has(u.displayName)) seen.set(u.displayName, u);
      setPresence(Array.from(seen.values()));
    };
    const onConnect = () => {
      if (displayName) {
        socket.emit(
          'join_board',
          { boardId, displayName },
          (ack) => {
            if (!ack?.ok) toast.error(ack?.error || 'Failed to join board');
            else setJoined(true);
          },
        );
      }
    };
    const onDisconnect = () => setJoined(false);

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);
    socket.on('presence', onPresence);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected, run join now
    if (socket.connected) onConnect();

    return () => {
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.off('presence', onPresence);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [boardId, displayName, toast]);

  const commentsByCard = useMemo(() => {
    const map = new Map();
    for (const c of comments) {
      if (!map.has(c.cardId)) map.set(c.cardId, []);
      map.get(c.cardId).push(c);
    }
    return map;
  }, [comments]);

  const cardsByColumn = useMemo(() => {
    const map = new Map();
    for (const card of cards) {
      if (!map.has(card.columnId)) map.set(card.columnId, []);
      map.get(card.columnId).push(card);
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position);
    return map;
  }, [cards]);

  const openCard = useMemo(
    () => cards.find((c) => c.id === openCardId) ?? null,
    [openCardId, cards],
  );

  const handleGuestSubmit = (name) => {
    setDisplayName(name);
    window.dispatchEvent(new Event('retro:identity'));
    setName(name);
  };

  const handleAddCard = (columnId, content) => {
    const socket = socketRef.current;
    if (!socket || !joined) return toast.error('Not connected yet');
    socket.emit('add_card', { columnId, content }, (ack) => {
      if (!ack?.ok) toast.error(ack?.error || 'Failed to add card');
    });
  };

  const handleAddComment = (cardId, content) =>
    new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket || !joined) {
        toast.error('Not connected yet');
        return resolve();
      }
      socket.emit('add_comment', { cardId, content }, (ack) => {
        if (!ack?.ok) toast.error(ack?.error || 'Failed to post comment');
        resolve();
      });
    });

  const handleAddColumn = (title) => {
    const socket = socketRef.current;
    if (!socket || !joined) return toast.error('Not connected yet');
    socket.emit('add_column', { title }, (ack) => {
      if (!ack?.ok) toast.error(ack?.error || 'Failed to add column');
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const socket = socketRef.current;
    if (!socket || !joined) return toast.error('Not connected yet');

    // Optimistic update — we compute a temporary position between neighbours.
    setCards((current) => {
      const next = current.map((c) =>
        c.id === draggableId ? { ...c, columnId: destination.droppableId } : c,
      );
      const targetList = next
        .filter((c) => c.columnId === destination.droppableId && c.id !== draggableId)
        .sort((a, b) => a.position - b.position);
      let newPos;
      if (targetList.length === 0) newPos = 1000;
      else if (destination.index <= 0) newPos = targetList[0].position - 1000;
      else if (destination.index >= targetList.length)
        newPos = targetList[targetList.length - 1].position + 1000;
      else {
        const prev = targetList[destination.index - 1].position;
        const nxt = targetList[destination.index].position;
        newPos = (prev + nxt) / 2;
      }
      return next.map((c) => (c.id === draggableId ? { ...c, position: newPos } : c));
    });

    socket.emit(
      'move_card',
      {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toIndex: destination.index,
      },
      (ack) => {
        if (!ack?.ok) {
          toast.error(ack?.error || 'Failed to move card');
          // Roll back by refetching authoritative state
          loadBoard();
        }
      },
    );
  };

  const handleExport = () => {
    window.open(api.exportUrl(boardId), '_blank', 'noopener');
  };

  if (loading) {
    return (
      <main className="loading"><div className="spinner" /><span>Loading board…</span></main>
    );
  }

  if (error || !board) {
    return (
      <main className="container">
        <div className="empty">
          <p>{error || 'Board not found.'}</p>
          <div className="mt-4">
            <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to boards</button>
          </div>
        </div>
      </main>
    );
  }

  const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);
  const needsGuest = !displayName;

  return (
    <>
      <main>
        <div className="board-topbar">
          <Link to="/" className="board-back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M11 19l-7-7 7-7" /></svg>
            All boards
          </Link>
          <h1 className="board-title">{board.title}</h1>

          <div className="presence" title={`${presence.length} online`}>
            <span className="presence-avatars">
              {presence.slice(0, 4).map((u) => (
                <span
                  key={u.id}
                  className="avatar"
                  style={{ background: avatarGradient(u.displayName) }}
                  title={u.displayName}
                >
                  {initials(u.displayName)}
                </span>
              ))}
              {presence.length > 4 && (
                <span className="avatar" style={{ background: 'var(--surface-strong)' }}>+{presence.length - 4}</span>
              )}
            </span>
            <span>{presence.length} online</span>
          </div>

          <button className="btn btn-outline btn-sm" onClick={handleExport} title="Download CSV">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
            Export CSV
          </button>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="columns-wrap">
            {sortedColumns.map((column) => {
              const list = cardsByColumn.get(column.id) ?? [];
              return (
                <section className="column" key={column.id}>
                  <div className="column-head">
                    <div className="column-title">
                      <span className="column-title-dot" />
                      {column.title}
                    </div>
                    <span className="column-count">{list.length}</span>
                  </div>
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`column-cards${snapshot.isDraggingOver ? ' is-over' : ''}`}
                      >
                        {list.map((card, index) => (
                          <CardView
                            key={card.id}
                            card={card}
                            index={index}
                            commentCount={(commentsByCard.get(card.id) ?? []).length}
                            onOpen={() => setOpenCardId(card.id)}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                  <AddCardForm columnId={column.id} onSubmit={(content) => handleAddCard(column.id, content)} />
                </section>
              );
            })}

            <AddColumn onSubmit={handleAddColumn} />
          </div>
        </DragDropContext>

        <div style={{ textAlign: 'center', padding: '0 32px 32px', color: 'var(--text-3)', fontSize: 12 }}>
          Created {formatRelative(board.createdAt)}
        </div>
      </main>

      {needsGuest && (
        <GuestModal boardTitle={board.title} onSubmit={handleGuestSubmit} />
      )}

      {openCard && (
        <CardDetailsModal
          card={openCard}
          comments={commentsByCard.get(openCard.id) ?? []}
          onClose={() => setOpenCardId(null)}
          onAddComment={(content) => handleAddComment(openCard.id, content)}
        />
      )}
    </>
  );
}
