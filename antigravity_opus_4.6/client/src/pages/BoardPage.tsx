import { useState, useEffect, useCallback, useRef } from 'react';
import type { FormEvent, DragEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import {
  fetchBoard,
  createColumn,
  getExportUrl,
} from '../api';
import type {
  BoardWithDetails,
  BoardColumn,
  Card,
  Comment,
} from '../api';

// Guest Auth Modal Component
function GuestAuthModal({
  onSubmit,
}: {
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Welcome!</h2>
        <p>Enter your display name to join this retrospective board.</p>
        <form onSubmit={handleSubmit}>
          <input
            id="guest-name-input"
            className="input"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            autoFocus
          />
          <button
            id="join-board-btn"
            className="btn btn-primary"
            type="submit"
            disabled={!name.trim()}
            style={{ width: '100%' }}
          >
            Join Board
          </button>
        </form>
      </div>
    </div>
  );
}

// Card Component — uses native HTML5 drag-and-drop
function CardItem({
  card,
  boardId,
  socket,
  userName,
  onDragStart,
}: {
  card: Card;
  boardId: string;
  socket: Socket | null;
  userName: string;
  onDragStart: (cardId: string, sourceColumnId: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(card.comments || []);

  // Listen for new comments on this card
  useEffect(() => {
    if (!socket) return;

    function handleCommentAdded(data: { cardId: string; comment: Comment }) {
      if (data.cardId === card.id) {
        setComments((prev) => {
          if (prev.some((c) => c.id === data.comment.id)) return prev;
          return [...prev, data.comment];
        });
      }
    }

    socket.on('comment_added', handleCommentAdded);
    return () => {
      socket.off('comment_added', handleCommentAdded);
    };
  }, [socket, card.id]);

  function handleAddComment(e: FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !socket) return;

    socket.emit('add_comment', {
      boardId,
      cardId: card.id,
      content: commentText.trim(),
      authorName: userName,
    });

    setCommentText('');
  }

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase();
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(card.id, card.column_id);

    // Add dragging class after a tick so browser captures the original element
    setTimeout(() => {
      (e.target as HTMLElement).classList.add('dragging');
    }, 0);
  }

  function handleDragEnd(e: DragEvent<HTMLDivElement>) {
    (e.target as HTMLElement).classList.remove('dragging');
  }

  return (
    <div
      className="card"
      id={`card-${card.id}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="card-content">{card.content}</div>
      <div className="card-meta">
        <span className="card-author">
          <span className="mini-avatar">{getInitial(card.author_name)}</span>
          {card.author_name}
        </span>
        <span
          className="card-comments-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setShowComments(!showComments);
          }}
        >
          💬 {comments.length}
        </span>
      </div>

      {showComments && (
        <div className="comments-section">
          {comments.map((comment) => (
            <div key={comment.id} className="comment">
              <span className="mini-avatar">
                {getInitial(comment.author_name)}
              </span>
              <div className="comment-body">
                <div className="comment-author">{comment.author_name}</div>
                <div className="comment-text">{comment.content}</div>
              </div>
            </div>
          ))}

          <form className="add-comment-form" onSubmit={handleAddComment}>
            <input
              className="input"
              type="text"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={!commentText.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Column Component — uses native drag-and-drop as drop target
function ColumnComponent({
  column,
  boardId,
  socket,
  userName,
  dragState,
  onDragStart,
  onDrop,
}: {
  column: BoardColumn & { cards: Card[] };
  boardId: string;
  socket: Socket | null;
  userName: string;
  dragState: { cardId: string; sourceColumnId: string } | null;
  onDragStart: (cardId: string, sourceColumnId: string) => void;
  onDrop: (targetColumnId: string) => void;
}) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [cardContent, setCardContent] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (showAddCard && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showAddCard]);

  function handleAddCard(e: FormEvent) {
    e.preventDefault();
    if (!cardContent.trim() || !socket) return;

    socket.emit('add_card', {
      boardId,
      columnId: column.id,
      content: cardContent.trim(),
      authorName: userName,
    });

    setCardContent('');
    setShowAddCard(false);
  }

  function getColumnType(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('well') || lower.includes('good') || lower.includes('liked')) return 'went-well';
    if (lower.includes('improve') || lower.includes('change') || lower.includes('didn')) return 'improve';
    if (lower.includes('action') || lower.includes('do') || lower.includes('try')) return 'action';
    return '';
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    // Only trigger if leaving the droppable area itself, not child elements
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }

  function handleDropOnColumn(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(column.id);
  }

  return (
    <div className="column" data-column-type={getColumnType(column.title)}>
      <div className="column-header">
        <span className="column-title">{column.title}</span>
        <span className="column-count">{column.cards.length}</span>
      </div>

      <div
        className={`column-cards ${isDragOver ? 'dragging-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropOnColumn}
      >
        {column.cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            boardId={boardId}
            socket={socket}
            userName={userName}
            onDragStart={onDragStart}
          />
        ))}
      </div>

      <div className="column-footer">
        {showAddCard ? (
          <form className="add-card-form" onSubmit={handleAddCard}>
            <textarea
              ref={inputRef}
              className="input"
              placeholder="What's on your mind?"
              value={cardContent}
              onChange={(e) => setCardContent(e.target.value)}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard(e);
                }
                if (e.key === 'Escape') {
                  setShowAddCard(false);
                  setCardContent('');
                }
              }}
            />
            <div className="form-actions">
              <button
                className="btn btn-primary btn-sm"
                type="submit"
                disabled={!cardContent.trim()}
              >
                Add Card
              </button>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => {
                  setShowAddCard(false);
                  setCardContent('');
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="add-card-btn"
            onClick={() => setShowAddCard(true)}
          >
            + Add a card
          </button>
        )}
      </div>
    </div>
  );
}

// Main Board Page
export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<BoardWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>(() => {
    return sessionStorage.getItem('retro-username') || '';
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [dragState, setDragState] = useState<{ cardId: string; sourceColumnId: string } | null>(null);

  // Load board data
  useEffect(() => {
    if (!id) return;
    loadBoard();
  }, [id]);

  async function loadBoard() {
    try {
      const data = await fetchBoard(id!);
      setBoard(data);
    } catch (err) {
      console.error('Failed to load board:', err);
    } finally {
      setLoading(false);
    }
  }

  // Connect socket when user has a name
  useEffect(() => {
    if (!userName || !id) return;

    const s = io({ transports: ['websocket', 'polling'] });

    s.on('connect', () => {
      s.emit('join_board', id);
    });

    // Listen for real-time events
    s.on('card_added', (card: Card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            if (col.id === card.column_id) {
              // Prevent duplicate cards
              if (col.cards.some((c) => c.id === card.id)) return col;
              return { ...col, cards: [...col.cards, card] };
            }
            return col;
          }),
        };
      });
    });

    s.on('card_moved', (data: { cardId: string; targetColumnId: string; newPosition: number }) => {
      setBoard((prev) => {
        if (!prev) return prev;

        let movedCard: Card | null = null;

        // Remove card from source column
        const withoutCard = prev.columns.map((col) => {
          const idx = col.cards.findIndex((c) => c.id === data.cardId);
          if (idx !== -1) {
            movedCard = col.cards[idx];
            return { ...col, cards: col.cards.filter((c) => c.id !== data.cardId) };
          }
          return col;
        });

        if (!movedCard) return prev;

        // Add card to target column
        return {
          ...prev,
          columns: withoutCard.map((col) => {
            if (col.id === data.targetColumnId) {
              const newCards = [...col.cards];
              const updatedCard = { ...movedCard!, column_id: data.targetColumnId, position: data.newPosition };
              newCards.splice(data.newPosition, 0, updatedCard);
              return { ...col, cards: newCards };
            }
            return col;
          }),
        };
      });
    });

    s.on('column_added', (column: BoardColumn & { cards: Card[] }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.columns.some((c) => c.id === column.id)) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: column.cards || [] }],
        };
      });
    });

    s.on('disconnect', () => {
      console.log('Socket disconnected, attempting reconnect…');
    });

    s.on('reconnect', () => {
      // Refetch board to get consistent state
      loadBoard();
    });

    setSocket(s);

    return () => {
      s.emit('leave_board', id);
      s.disconnect();
    };
  }, [userName, id]);

  // Handle native drag-and-drop
  const handleDragStart = useCallback(
    (cardId: string, sourceColumnId: string) => {
      setDragState({ cardId, sourceColumnId });
    },
    []
  );

  const handleDrop = useCallback(
    (targetColumnId: string) => {
      if (!dragState || !socket || !board) return;

      const { cardId, sourceColumnId } = dragState;

      // Don't do anything if dropped on same column
      if (sourceColumnId === targetColumnId) {
        setDragState(null);
        return;
      }

      // Find the target column's card count for position
      const targetCol = board.columns.find((c) => c.id === targetColumnId);
      const newPosition = targetCol ? targetCol.cards.length : 0;

      // Optimistic update
      setBoard((prev) => {
        if (!prev) return prev;

        let movedCard: Card | null = null;

        const withoutCard = prev.columns.map((col) => {
          const idx = col.cards.findIndex((c) => c.id === cardId);
          if (idx !== -1) {
            movedCard = col.cards[idx];
            return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
          }
          return col;
        });

        if (!movedCard) return prev;

        return {
          ...prev,
          columns: withoutCard.map((col) => {
            if (col.id === targetColumnId) {
              const updatedCard = { ...movedCard!, column_id: targetColumnId, position: newPosition };
              return { ...col, cards: [...col.cards, updatedCard] };
            }
            return col;
          }),
        };
      });

      // Emit to server
      socket.emit('move_card', {
        boardId: id,
        cardId,
        targetColumnId,
        newPosition,
      });

      setDragState(null);
    },
    [dragState, socket, board, id]
  );

  // Handle guest auth
  function handleGuestAuth(name: string) {
    sessionStorage.setItem('retro-username', name);
    setUserName(name);
  }

  // Handle adding column
  async function handleAddColumn(e: FormEvent) {
    e.preventDefault();
    if (!newColumnTitle.trim() || !id) return;

    try {
      const column = await createColumn(id, newColumnTitle.trim());
      const columnWithCards = { ...column, cards: [] as Card[] };

      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, columnWithCards] };
      });

      // Broadcast to other clients
      if (socket) {
        socket.emit('add_column', { boardId: id, column: columnWithCards });
      }

      setNewColumnTitle('');
      setAddingColumn(false);
    } catch (err) {
      console.error('Failed to create column:', err);
    }
  }

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase();
  }

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <span className="loading-text">Loading board…</span>
      </div>
    );
  }

  // Board not found
  if (!board) {
    return (
      <div className="loading-container">
        <div className="empty-state-icon">🔍</div>
        <p className="loading-text">Board not found</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Back to Home
        </Link>
      </div>
    );
  }

  // Guest auth modal
  if (!userName) {
    return (
      <>
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            <div className="navbar-logo">R</div>
            <span className="navbar-title">RetroBoard</span>
          </Link>
        </nav>
        <GuestAuthModal onSubmit={handleGuestAuth} />
      </>
    );
  }

  return (
    <div className="board-page page-enter">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">R</div>
          <span className="navbar-title">RetroBoard</span>
        </Link>
        <div className="navbar-actions">
          <div className="user-badge">
            <span className="avatar">{getInitial(userName)}</span>
            {userName}
          </div>
        </div>
      </nav>

      <div className="board-header">
        <div className="board-header-left">
          <Link to="/" className="btn btn-ghost btn-sm">
            ← Back
          </Link>
          <h1 className="board-title">{board.title}</h1>
        </div>
        <div className="board-header-right">
          <a
            href={getExportUrl(id!)}
            className="btn btn-secondary btn-sm"
            id="export-csv-btn"
            download
          >
            📥 Export CSV
          </a>
        </div>
      </div>

      <div className="columns-container">
        {board.columns.map((column) => (
          <ColumnComponent
            key={column.id}
            column={column}
            boardId={id!}
            socket={socket}
            userName={userName}
            dragState={dragState}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}

        {addingColumn ? (
          <div className="add-column-form">
            <form onSubmit={handleAddColumn}>
              <input
                className="input"
                type="text"
                placeholder="Column title…"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setAddingColumn(false);
                    setNewColumnTitle('');
                  }
                }}
              />
              <div className="form-actions">
                <button
                  className="btn btn-primary btn-sm"
                  type="submit"
                  disabled={!newColumnTitle.trim()}
                >
                  Add Column
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => {
                    setAddingColumn(false);
                    setNewColumnTitle('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            className="add-column"
            id="add-column-btn"
            onClick={() => setAddingColumn(true)}
          >
            + Add Column
          </button>
        )}
      </div>
    </div>
  );
}
