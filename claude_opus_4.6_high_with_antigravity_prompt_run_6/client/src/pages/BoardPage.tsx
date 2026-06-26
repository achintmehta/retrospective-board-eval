import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { GuestModal } from '../components/GuestModal';
import { CommentsPanel } from '../components/CommentsPanel';

interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: string;
  position: number;
  comments: Comment[];
}

interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  cards: Card[];
}

interface Board {
  id: string;
  title: string;
  created_at: string;
  columns: Column[];
}

export function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState(() => sessionStorage.getItem('retroGuestName') || '');
  const [showGuestModal, setShowGuestModal] = useState(!guestName);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeComment, setActiveComment] = useState<Card | null>(null);
  const [addingCardColumn, setAddingCardColumn] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then(res => res.json())
      .then(data => { setBoard(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  useEffect(() => {
    if (!id || showGuestModal) return;

    const s = io(window.location.origin.includes('localhost:5173') ? 'http://localhost:3001' : undefined as unknown as string);
    s.emit('join_board', id);

    s.on('card_added', ({ columnId, card }: { columnId: string; card: Card }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === columnId ? { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] } : col
          )
        };
      });
    });

    s.on('card_moved', ({ cardId, newColumnId }: { cardId: string; newColumnId: string; newPosition: number; card: Card }) => {
      setBoard(prev => {
        if (!prev) return prev;
        let movedCard: Card | undefined;
        const withoutCard = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => {
            if (c.id === cardId) { movedCard = c; return false; }
            return true;
          })
        }));
        if (!movedCard) return prev;
        return {
          ...prev,
          columns: withoutCard.map(col =>
            col.id === newColumnId ? { ...col, cards: [...col.cards, { ...movedCard!, column_id: newColumnId }] } : col
          )
        };
      });
    });

    s.on('comment_added', ({ cardId, comment }: { cardId: string; comment: Comment }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.cards.map(card =>
              card.id === cardId ? { ...card, comments: [...card.comments, comment] } : card
            )
          }))
        };
      });
      setActiveComment(prev => {
        if (prev && prev.id === cardId) {
          return { ...prev, comments: [...prev.comments, comment] };
        }
        return prev;
      });
    });

    s.on('column_added', (column: Column) => {
      setBoard(prev => {
        if (!prev) return prev;
        if (prev.columns.some(c => c.id === column.id)) return prev;
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] };
      });
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [id, showGuestModal]);

  const handleGuestSubmit = (name: string) => {
    sessionStorage.setItem('retroGuestName', name);
    setGuestName(name);
    setShowGuestModal(false);
  };

  const handleAddCard = (columnId: string) => {
    if (!newCardText.trim() || !socket) return;
    socket.emit('add_card', {
      columnId,
      content: newCardText.trim(),
      authorName: guestName,
      boardId: id
    });
    setNewCardText('');
    setAddingCardColumn(null);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !socket) return;
    const { draggableId, destination } = result;
    socket.emit('move_card', {
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
      boardId: id
    });
  };

  const handleAddComment = (cardId: string, content: string) => {
    if (!socket) return;
    socket.emit('add_comment', {
      cardId,
      content,
      authorName: guestName,
      boardId: id
    });
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() })
    });
    setNewColumnTitle('');
    setShowAddColumn(false);
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  if (showGuestModal) {
    return <GuestModal onSubmit={handleGuestSubmit} />;
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading"><div className="spinner" /> Loading board...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="page">
        <div className="loading">Board not found.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="board-header">
          <div className="board-header-left">
            <Link to="/" className="back-link" id="back-to-home">
              ← Boards
            </Link>
            <h1>{board.title}</h1>
          </div>
          <div className="board-header-actions">
            <button id="export-csv-btn" className="btn-secondary" onClick={handleExport}>
              📥 Export CSV
            </button>
          </div>
        </div>
      </header>

      <div className="page-content">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="columns-container">
            {board.columns.map(column => (
              <div className="column" key={column.id}>
                <div className="column-header">
                  <h2>{column.title}</h2>
                  <span className="card-count">{column.cards.length}</span>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div
                      className="column-cards"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {column.cards.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div className="card-content">{card.content}</div>
                              <div className="card-meta">
                                <div className="card-author">
                                  <span className="avatar">
                                    {card.author_name.charAt(0).toUpperCase()}
                                  </span>
                                  {card.author_name}
                                </div>
                                <button
                                  className="card-comments-btn"
                                  onClick={() => setActiveComment(card)}
                                  id={`comments-btn-${card.id}`}
                                >
                                  💬 {card.comments.length}
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <div className="add-card-area">
                  {addingCardColumn === column.id ? (
                    <div className="add-card-input">
                      <textarea
                        placeholder="What's on your mind?"
                        value={newCardText}
                        onChange={e => setNewCardText(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddCard(column.id);
                          }
                          if (e.key === 'Escape') {
                            setAddingCardColumn(null);
                            setNewCardText('');
                          }
                        }}
                        id={`card-textarea-${column.id}`}
                      />
                      <div className="btn-row">
                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => { setAddingCardColumn(null); setNewCardText(''); }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleAddCard(column.id)}
                          id={`submit-card-${column.id}`}
                        >
                          Add Card
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="add-card-trigger"
                      onClick={() => setAddingCardColumn(column.id)}
                      id={`add-card-${column.id}`}
                    >
                      + Add a card
                    </button>
                  )}
                </div>
              </div>
            ))}

            {showAddColumn ? (
              <form className="add-column-form" onSubmit={handleAddColumn}>
                <input
                  placeholder="Column title..."
                  value={newColumnTitle}
                  onChange={e => setNewColumnTitle(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setShowAddColumn(false); setNewColumnTitle(''); }
                  }}
                  id="new-column-input"
                />
                <button type="submit" className="btn-primary btn-sm" id="submit-column-btn">Add</button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => { setShowAddColumn(false); setNewColumnTitle(''); }}
                >
                  ✕
                </button>
              </form>
            ) : (
              <button
                className="add-column-btn"
                onClick={() => setShowAddColumn(true)}
                id="add-column-btn"
              >
                + Add Column
              </button>
            )}
          </div>
        </DragDropContext>
      </div>

      {activeComment && (
        <CommentsPanel
          card={activeComment}
          onClose={() => setActiveComment(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}
