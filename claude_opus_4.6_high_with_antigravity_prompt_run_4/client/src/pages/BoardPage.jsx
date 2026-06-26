import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GuestModal from '../components/GuestModal';
import CardItem from '../components/CardItem';
import AddCardForm from '../components/AddCardForm';
import CommentPanel from '../components/CommentPanel';
import './BoardPage.css';

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [userName, setUserName] = useState(() => sessionStorage.getItem('retro_user') || '');
  const [showGuestModal, setShowGuestModal] = useState(!sessionStorage.getItem('retro_user'));
  const [activeCard, setActiveCard] = useState(null);
  const [addingColumnName, setAddingColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const socketRef = useRef(null);

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setBoard)
      .catch(() => navigate('/'));
  }, [id, navigate]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!userName) return;
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_board', id);
    });

    socket.on('card_added', ({ columnId, card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
          ),
        };
      });
    });

    socket.on('card_moved', ({ card, newColumnId }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            const without = col.cards.filter((c) => c.id !== card.id);
            if (col.id === newColumnId) {
              return { ...col, cards: [...without, { ...card, column_id: newColumnId }] };
            }
            return { ...col, cards: without };
          }),
        };
      });
    });

    socket.on('comment_added', ({ cardId, comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === cardId ? { ...c, comments: [...(c.comments || []), comment] } : c
            ),
          })),
        };
      });
    });

    socket.on('column_added', (column) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: [] }],
        };
      });
    });

    return () => socket.disconnect();
  }, [id, userName]);

  const handleGuestSubmit = (name) => {
    sessionStorage.setItem('retro_user', name);
    setUserName(name);
    setShowGuestModal(false);
  };

  const handleAddCard = (columnId, content) => {
    socketRef.current?.emit('add_card', {
      columnId,
      content,
      authorName: userName,
      boardId: id,
    });
  };

  const handleAddComment = (cardId, content) => {
    socketRef.current?.emit('add_comment', {
      cardId,
      content,
      authorName: userName,
      boardId: id,
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    socketRef.current?.emit('move_card', {
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
      boardId: id,
    });

    setBoard((prev) => {
      if (!prev) return prev;
      let movedCard = null;
      const cols = prev.columns.map((col) => {
        const idx = col.cards.findIndex((c) => c.id === draggableId);
        if (idx !== -1) {
          movedCard = col.cards[idx];
          return { ...col, cards: col.cards.filter((c) => c.id !== draggableId) };
        }
        return col;
      });
      if (!movedCard) return prev;
      return {
        ...prev,
        columns: cols.map((col) => {
          if (col.id === destination.droppableId) {
            const newCards = [...col.cards];
            newCards.splice(destination.index, 0, { ...movedCard, column_id: col.id });
            return { ...col, cards: newCards };
          }
          return col;
        }),
      };
    });
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!addingColumnName.trim()) return;
    await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: addingColumnName.trim() }),
    });
    setAddingColumnName('');
    setShowAddColumn(false);
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  const findCard = (cardId) => {
    if (!board) return null;
    for (const col of board.columns) {
      const card = col.cards.find((c) => c.id === cardId);
      if (card) return card;
    }
    return null;
  };

  if (showGuestModal) {
    return <GuestModal onSubmit={handleGuestSubmit} />;
  }

  if (!board) {
    return (
      <div className="board-loading">
        <div className="loader" />
      </div>
    );
  }

  const columnColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4'];

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-left">
          <button className="btn-secondary back-btn" onClick={() => navigate('/')} id="back-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="board-title">{board.title}</h1>
        </div>
        <div className="board-header-right">
          <span className="user-badge">
            <span className="user-dot" />
            {userName}
          </span>
          <button className="btn-secondary" onClick={handleExport} id="export-csv-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export CSV
          </button>
          <button className="btn-primary" onClick={() => setShowAddColumn(true)} id="add-column-btn">
            + Column
          </button>
        </div>
      </header>

      {showAddColumn && (
        <div className="add-column-bar animate-fade-in">
          <form onSubmit={handleAddColumn} className="add-column-form">
            <input
              className="input-field"
              type="text"
              placeholder="Column name..."
              value={addingColumnName}
              onChange={(e) => setAddingColumnName(e.target.value)}
              autoFocus
              id="column-name-input"
            />
            <button type="submit" className="btn-primary" id="save-column-btn">Add</button>
            <button type="button" className="btn-secondary" onClick={() => setShowAddColumn(false)}>Cancel</button>
          </form>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns.map((col, colIdx) => (
            <div key={col.id} className="column" style={{ animationDelay: `${colIdx * 0.1}s` }}>
              <div className="column-header" style={{ '--col-color': columnColors[colIdx % columnColors.length] }}>
                <div className="column-color-bar" />
                <h2>{col.title}</h2>
                <span className="card-count">{col.cards.length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    className={`column-body ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {col.cards.map((card, idx) => (
                      <Draggable key={card.id} draggableId={card.id} index={idx}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                          >
                            <CardItem
                              card={card}
                              isDragging={snap.isDragging}
                              onClick={() => setActiveCard(card.id)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <AddCardForm columnId={col.id} onAdd={handleAddCard} />
            </div>
          ))}

          {board.columns.length === 0 && (
            <div className="empty-board animate-fade-in">
              <div className="empty-board-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 17h7M17.5 14v7" />
                </svg>
              </div>
              <h3>No columns yet</h3>
              <p>Add columns like "Went Well", "Needs Improvement", or "Action Items" to get started.</p>
            </div>
          )}
        </div>
      </DragDropContext>

      {activeCard && (
        <CommentPanel
          card={findCard(activeCard)}
          onClose={() => setActiveCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}
