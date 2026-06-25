import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('displayName') || '');
  const [nameInput, setNameInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [newCardTexts, setNewCardTexts] = useState({});
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(res => res.json())
      .then(setBoard);
  }, [id]);

  useEffect(() => {
    if (!displayName) return;

    const s = io({ transports: ['websocket', 'polling'] });
    s.emit('join_board', id);

    s.on('card_added', ({ columnId, card }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
          )
        };
      });
    });

    s.on('card_moved', ({ card, newColumnId }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.id === newColumnId
              ? [...col.cards.filter(c => c.id !== card.id), card]
              : col.cards.filter(c => c.id !== card.id)
          }))
        };
      });
    });

    s.on('comment_added', ({ cardId, comment }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.cards.map(c =>
              c.id === cardId ? { ...c, comments: [...c.comments, comment] } : c
            )
          }))
        };
      });
      setSelectedCard(prev => {
        if (prev && prev.id === cardId) {
          return { ...prev, comments: [...prev.comments, comment] };
        }
        return prev;
      });
    });

    s.on('column_added', ({ column }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] };
      });
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [displayName, id]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    sessionStorage.setItem('displayName', nameInput.trim());
    setDisplayName(nameInput.trim());
  };

  const handleAddCard = (columnId) => {
    const text = newCardTexts[columnId];
    if (!text || !text.trim()) return;
    socket.emit('add_card', {
      columnId,
      content: text.trim(),
      authorName: displayName,
      boardId: Number(id)
    });
    setNewCardTexts(prev => ({ ...prev, [columnId]: '' }));
  };

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    socket.emit('add_column', { boardId: Number(id), title: newColumnTitle.trim() });
    setNewColumnTitle('');
  };

  const handleDragEnd = useCallback((result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const cardId = Number(draggableId);
    const newColumnId = Number(destination.droppableId);
    const newPosition = destination.index;

    socket.emit('move_card', {
      cardId,
      newColumnId,
      newPosition,
      boardId: Number(id)
    });
  }, [socket, id]);

  const handleAddComment = () => {
    if (!commentText.trim() || !selectedCard) return;
    socket.emit('add_comment', {
      cardId: selectedCard.id,
      content: commentText.trim(),
      authorName: displayName,
      boardId: Number(id)
    });
    setCommentText('');
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  if (!displayName) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <form onSubmit={handleJoin} style={{ textAlign: 'center' }}>
          <h2>Join Board</h2>
          <p>Enter your display name to participate:</p>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name..."
            style={{ padding: 8, marginRight: 8 }}
            autoFocus
          />
          <button type="submit" style={{ padding: 8 }}>Join</button>
        </form>
      </div>
    );
  }

  if (!board) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>{board.title}</h1>
        <div>
          <span style={{ marginRight: 10, color: '#666' }}>Logged in as: {displayName}</span>
          <button onClick={handleExport} style={{ padding: '6px 12px' }}>Export to CSV</button>
        </div>
      </div>

      <form onSubmit={handleAddColumn} style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={newColumnTitle}
          onChange={(e) => setNewColumnTitle(e.target.value)}
          placeholder="New column title..."
          style={{ padding: 6, marginRight: 8 }}
        />
        <button type="submit" style={{ padding: 6 }}>Add Column</button>
      </form>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
          {board.columns.map(col => (
            <Droppable key={col.id} droppableId={String(col.id)}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minWidth: 280,
                    backgroundColor: '#f4f4f4',
                    borderRadius: 8,
                    padding: 12,
                    maxHeight: '70vh',
                    overflowY: 'auto'
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>{col.title}</h3>

                  {col.cards.map((card, index) => (
                    <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => setSelectedCard(card)}
                          style={{
                            backgroundColor: '#fff',
                            padding: 10,
                            marginBottom: 8,
                            borderRadius: 4,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            ...provided.draggableProps.style
                          }}
                        >
                          <p style={{ margin: 0 }}>{card.content}</p>
                          <small style={{ color: '#888' }}>
                            {card.author_name} {card.comments.length > 0 && `| ${card.comments.length} comment(s)`}
                          </small>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      value={newCardTexts[col.id] || ''}
                      onChange={(e) => setNewCardTexts(prev => ({ ...prev, [col.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCard(col.id); }}
                      placeholder="Add a card..."
                      style={{ width: '100%', padding: 6, boxSizing: 'border-box' }}
                    />
                    <button
                      onClick={() => handleAddCard(col.id)}
                      style={{ marginTop: 4, width: '100%', padding: 6 }}
                    >
                      Add Card
                    </button>
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {selectedCard && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 1000
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedCard(null); }}
        >
          <div style={{
            backgroundColor: '#fff', padding: 20, borderRadius: 8,
            width: 400, maxHeight: '80vh', overflowY: 'auto'
          }}>
            <h3>{selectedCard.content}</h3>
            <small style={{ color: '#888' }}>by {selectedCard.author_name}</small>

            <h4 style={{ marginTop: 16 }}>Comments</h4>
            {selectedCard.comments.length === 0 ? (
              <p style={{ color: '#888' }}>No comments yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {selectedCard.comments.map(c => (
                  <li key={c.id} style={{ marginBottom: 8, padding: 8, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                    <p style={{ margin: 0 }}>{c.content}</p>
                    <small style={{ color: '#888' }}>{c.author_name} - {new Date(c.created_at).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            )}

            <div style={{ marginTop: 12 }}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                placeholder="Add a comment..."
                style={{ width: '100%', padding: 6, boxSizing: 'border-box' }}
              />
              <button onClick={handleAddComment} style={{ marginTop: 4, padding: 6 }}>
                Add Comment
              </button>
            </div>

            <button
              onClick={() => setSelectedCard(null)}
              style={{ marginTop: 12, padding: '6px 12px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BoardPage;
