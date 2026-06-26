import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GuestModal from '../components/GuestModal';
import CardModal from '../components/CardModal';
import AddColumnForm from '../components/AddColumnForm';
import './BoardPage.css';

const COLUMN_COLORS = [
  'var(--column-went-well)',
  'var(--column-improve)',
  'var(--column-action)',
  'var(--column-default)'
];

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('retro_display_name') || '');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [newCardText, setNewCardText] = useState({});
  const [addingCardTo, setAddingCardTo] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(data => {
        setBoard(data);
        setLoading(false);
        if (!sessionStorage.getItem('retro_display_name')) {
          setShowGuestModal(true);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join_board', id);

    socket.on('card_added', ({ column_id, card }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === column_id
              ? { ...col, cards: [...col.cards, card] }
              : col
          )
        };
      });
    });

    socket.on('card_moved', ({ card_id, source_column_id, target_column_id, card }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => {
            if (col.id === source_column_id) {
              return { ...col, cards: col.cards.filter(c => c.id !== card_id) };
            }
            if (col.id === target_column_id) {
              return { ...col, cards: [...col.cards.filter(c => c.id !== card_id), { ...card, comments: card.comments || [] }] };
            }
            return col;
          })
        };
      });
    });

    socket.on('comment_added', ({ card_id, comment }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.cards.map(c =>
              c.id === card_id
                ? { ...c, comments: [...(c.comments || []), comment] }
                : c
            )
          }))
        };
      });

      setSelectedCard(prev => {
        if (prev && prev.id === card_id) {
          return { ...prev, comments: [...(prev.comments || []), comment] };
        }
        return prev;
      });
    });

    return () => {
      socket.emit('leave_board', id);
      socket.disconnect();
    };
  }, [id]);

  const handleGuestSubmit = (name) => {
    sessionStorage.setItem('retro_display_name', name);
    setDisplayName(name);
    setShowGuestModal(false);
  };

  const handleAddCard = (columnId) => {
    const text = newCardText[columnId];
    if (!text?.trim() || !displayName) return;

    socketRef.current.emit('add_card', {
      column_id: columnId,
      content: text.trim(),
      author_name: displayName,
      board_id: Number(id)
    });
    setNewCardText(prev => ({ ...prev, [columnId]: '' }));
    setAddingCardTo(null);
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const cardId = Number(draggableId);
    const sourceColId = Number(source.droppableId);
    const destColId = Number(destination.droppableId);

    setBoard(prev => {
      if (!prev) return prev;
      const newColumns = prev.columns.map(col => ({ ...col, cards: [...col.cards] }));
      const srcCol = newColumns.find(c => c.id === sourceColId);
      const destCol = newColumns.find(c => c.id === destColId);
      if (!srcCol || !destCol) return prev;

      const [movedCard] = srcCol.cards.splice(source.index, 1);
      destCol.cards.splice(destination.index, 0, movedCard);

      return { ...prev, columns: newColumns };
    });

    socketRef.current.emit('move_card', {
      card_id: cardId,
      source_column_id: sourceColId,
      target_column_id: destColId,
      board_id: Number(id)
    });
  };

  const handleAddComment = (cardId, text) => {
    if (!text?.trim() || !displayName) return;
    socketRef.current.emit('add_comment', {
      card_id: cardId,
      content: text.trim(),
      author_name: displayName,
      board_id: Number(id)
    });
  };

  const handleColumnAdded = (column) => {
    setBoard(prev => ({
      ...prev,
      columns: [...prev.columns, column]
    }));
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  if (loading) {
    return (
      <div className="board-loading">
        <div className="loading-state">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="board-not-found">
        <h2>Board not found</h2>
        <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="board-page">
      {showGuestModal && <GuestModal onSubmit={handleGuestSubmit} />}

      <header className="board-header">
        <div className="header-left">
          <button className="back-btn btn-secondary" onClick={() => navigate('/')}>
            &#8592; Boards
          </button>
          <h1 className="board-title">{board.title}</h1>
        </div>
        <div className="header-right">
          {displayName && (
            <span className="user-badge">
              <span className="user-avatar">{displayName[0].toUpperCase()}</span>
              {displayName}
            </span>
          )}
          <button className="btn-secondary export-btn" onClick={handleExport}>
            &#8615; Export CSV
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns.map((col, colIdx) => (
            <div key={col.id} className="column animate-fade-in-up" style={{ animationDelay: `${colIdx * 80}ms` }}>
              <div className="column-header" style={{ '--col-color': COLUMN_COLORS[colIdx % COLUMN_COLORS.length] }}>
                <div className="column-color-bar" />
                <h2>{col.title}</h2>
                <span className="card-count">{col.cards.length}</span>
              </div>

              <Droppable droppableId={String(col.id)}>
                {(provided, snapshot) => (
                  <div
                    className={`column-cards ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {col.cards.map((card, cardIdx) => (
                      <Draggable key={card.id} draggableId={String(card.id)} index={cardIdx}>
                        {(provided, snapshot) => (
                          <div
                            className={`retro-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedCard(card)}
                          >
                            <p className="card-content">{card.content}</p>
                            <div className="card-meta">
                              <span className="card-author">{card.author_name}</span>
                              {card.comments && card.comments.length > 0 && (
                                <span className="card-comments-count">
                                  &#128172; {card.comments.length}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {addingCardTo === col.id ? (
                <div className="add-card-form">
                  <textarea
                    className="input-field card-input"
                    placeholder="Type your thought..."
                    value={newCardText[col.id] || ''}
                    onChange={e => setNewCardText(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCard(col.id);
                      }
                      if (e.key === 'Escape') setAddingCardTo(null);
                    }}
                    autoFocus
                    rows={3}
                  />
                  <div className="add-card-actions">
                    <button className="btn-primary" onClick={() => handleAddCard(col.id)}>Add</button>
                    <button className="btn-secondary" onClick={() => setAddingCardTo(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  className="add-card-btn"
                  onClick={() => {
                    if (!displayName) {
                      setShowGuestModal(true);
                      return;
                    }
                    setAddingCardTo(col.id);
                  }}
                >
                  + Add Card
                </button>
              )}
            </div>
          ))}

          <AddColumnForm boardId={id} onColumnAdded={handleColumnAdded} />
        </div>
      </DragDropContext>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
          displayName={displayName}
        />
      )}
    </div>
  );
}
