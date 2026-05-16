import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GuestAuthModal from '../components/GuestAuthModal';
import CommentModal from '../components/CommentModal';

function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState(() => sessionStorage.getItem('retroGuestName') || '');
  const [showAuth, setShowAuth] = useState(false);
  const [commentCard, setCommentCard] = useState(null);
  const [addingCardCol, setAddingCardCol] = useState(null);
  const [newCardText, setNewCardText] = useState('');
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const socketRef = useRef(null);
  const boardRef = useRef(null);

  boardRef.current = board;

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(res => res.json())
      .then(data => {
        setBoard(data);
        setLoading(false);
        if (!sessionStorage.getItem('retroGuestName')) {
          setShowAuth(true);
        }
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const socket = io(window.location.origin.replace(/:\d+$/, ':3000'), {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_board', id);
    });

    socket.on('card_added', (card) => {
      setBoard(prev => {
        if (!prev) return prev;
        const columns = prev.columns.map(col =>
          col.id === card.column_id
            ? { ...col, cards: [...col.cards, card] }
            : col
        );
        return { ...prev, columns };
      });
    });

    socket.on('card_moved', ({ cardId, targetColumnId, position }) => {
      setBoard(prev => {
        if (!prev) return prev;
        let movedCard = null;
        const withoutCard = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => {
            if (c.id === cardId) { movedCard = c; return false; }
            return true;
          }),
        }));
        if (!movedCard) return prev;
        movedCard = { ...movedCard, column_id: targetColumnId, position };
        const columns = withoutCard.map(col =>
          col.id === targetColumnId
            ? { ...col, cards: [...col.cards, movedCard] }
            : col
        );
        return { ...prev, columns };
      });
    });

    socket.on('comment_added', (comment) => {
      setBoard(prev => {
        if (!prev) return prev;
        const columns = prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card =>
            card.id === comment.card_id
              ? { ...card, comments: [...(card.comments || []), comment] }
              : card
          ),
        }));
        return { ...prev, columns };
      });
    });

    socket.on('column_added', (column) => {
      setBoard(prev => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, column] };
      });
    });

    return () => {
      socket.emit('leave_board', id);
      socket.disconnect();
    };
  }, [id]);

  const handleAuthSubmit = (name) => {
    sessionStorage.setItem('retroGuestName', name);
    setGuestName(name);
    setShowAuth(false);
  };

  const handleAddCard = useCallback((columnId) => {
    if (!newCardText.trim() || !socketRef.current) return;
    socketRef.current.emit('add_card', {
      columnId,
      content: newCardText.trim(),
      authorName: guestName,
      boardId: Number(id),
    });
    setNewCardText('');
    setAddingCardCol(null);
  }, [newCardText, guestName, id]);

  const handleAddColumn = useCallback(() => {
    if (!newColTitle.trim() || !socketRef.current) return;
    socketRef.current.emit('add_column', {
      boardId: Number(id),
      title: newColTitle.trim(),
    });
    setNewColTitle('');
    setAddingColumn(false);
  }, [newColTitle, id]);

  const handleAddComment = useCallback((cardId, content) => {
    if (!content.trim() || !socketRef.current) return;
    socketRef.current.emit('add_comment', {
      cardId,
      content: content.trim(),
      authorName: guestName,
      boardId: Number(id),
    });
  }, [guestName, id]);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !socketRef.current) return;
    const { draggableId, destination } = result;
    const cardId = Number(draggableId);
    const targetColumnId = Number(destination.droppableId);
    const position = destination.index;

    socketRef.current.emit('move_card', {
      cardId,
      targetColumnId,
      position,
      boardId: Number(id),
    });
  }, [id]);

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  if (loading) {
    return <div className="loading"><span className="loading-dots"><span>.</span><span>.</span><span>.</span></span></div>;
  }

  if (!board) {
    return <div className="loading">Board not found</div>;
  }

  const currentCommentCard = commentCard
    ? board.columns.flatMap(c => c.cards).find(c => c.id === commentCard)
    : null;

  return (
    <>
      {showAuth && <GuestAuthModal onSubmit={handleAuthSubmit} />}

      {commentCard && currentCommentCard && (
        <CommentModal
          card={currentCommentCard}
          onClose={() => setCommentCard(null)}
          onAddComment={handleAddComment}
        />
      )}

      <div className="board-header">
        <h1 className="board-title">{board.title}</h1>
        <div className="board-actions">
          <button className="btn-ghost" onClick={handleExport}>&#x2913; Export CSV</button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns-container">
          {board.columns.map((col) => (
            <div className="column" key={col.id}>
              <div className="column-header">
                <span className="column-title">{col.title}</span>
                <span className="column-count">{col.cards.length}</span>
              </div>

              <Droppable droppableId={String(col.id)}>
                {(provided, snapshot) => (
                  <div
                    className={`column-cards ${snapshot.isDraggingOver ? 'drop-zone-active' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {col.cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                        {(provided, snapshot) => (
                          <div
                            className={`card ${snapshot.isDragging ? 'dragging' : ''}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <div className="card-content">{card.content}</div>
                            <div className="card-meta">
                              <span className="card-author">
                                <span className="card-author-dot" />
                                {card.author_name}
                              </span>
                              <button
                                className="card-comments-btn"
                                onClick={(e) => { e.stopPropagation(); setCommentCard(card.id); }}
                              >
                                &#x1F4AC; {(card.comments || []).length}
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

              <div className="column-footer">
                {addingCardCol === col.id ? (
                  <div className="add-card-input-wrap">
                    <textarea
                      placeholder="Type your card..."
                      value={newCardText}
                      onChange={e => setNewCardText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(col.id); } }}
                      autoFocus
                    />
                    <div className="add-card-actions">
                      <button className="btn-primary" onClick={() => handleAddCard(col.id)}>Add</button>
                      <button className="btn-ghost" onClick={() => { setAddingCardCol(null); setNewCardText(''); }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="add-card-btn" onClick={() => setAddingCardCol(col.id)}>+ Add card</button>
                )}
              </div>
            </div>
          ))}

          <div className="add-column-card" onClick={() => !addingColumn && setAddingColumn(true)}>
            {addingColumn ? (
              <div className="add-column-form" onClick={e => e.stopPropagation()}>
                <input
                  className="input-field"
                  placeholder="Column title..."
                  value={newColTitle}
                  onChange={e => setNewColTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddColumn(); }}
                  autoFocus
                />
                <div className="add-card-actions">
                  <button className="btn-primary" onClick={handleAddColumn}>Add</button>
                  <button className="btn-ghost" onClick={() => { setAddingColumn(false); setNewColTitle(''); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <span>+ Add column</span>
            )}
          </div>
        </div>
      </DragDropContext>
    </>
  );
}

export default BoardPage;
