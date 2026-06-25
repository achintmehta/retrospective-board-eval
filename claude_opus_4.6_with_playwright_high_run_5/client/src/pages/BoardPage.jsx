import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function BoardPage() {
  const { id } = useParams();
  const boardId = Number(id);
  const [board, setBoard] = useState(null);
  const [socket, setSocket] = useState(null);
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('displayName') || '');
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(!sessionStorage.getItem('displayName'));
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [cardTexts, setCardTexts] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [expandedCards, setExpandedCards] = useState({});

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${boardId}`)
      .then(r => r.json())
      .then(setBoard);
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (showNameModal) return;

    const s = io();
    s.on('connect', () => {
      s.emit('join_board', boardId);
    });

    s.on('card_added', (card) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === card.column_id ? { ...col, cards: [...col.cards, card] } : col
          ),
        };
      });
    });

    s.on('card_moved', (card) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => {
            const withoutCard = col.cards.filter(c => c.id !== card.id);
            if (col.id === card.column_id) {
              return { ...col, cards: [...withoutCard, card] };
            }
            return { ...col, cards: withoutCard };
          }),
        };
      });
    });

    s.on('comment_added', (comment) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.cards.map(card =>
              card.id === comment.card_id
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            ),
          })),
        };
      });
    });

    setSocket(s);
    return () => s.disconnect();
  }, [boardId, showNameModal]);

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const name = nameInput.trim();
    sessionStorage.setItem('displayName', name);
    setDisplayName(name);
    setShowNameModal(false);
  };

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    const res = await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() }),
    });
    const column = await res.json();
    setBoard(prev => ({
      ...prev,
      columns: [...prev.columns, { ...column, cards: [] }],
    }));
    setNewColumnTitle('');
  };

  const handleAddCard = (columnId) => {
    const text = cardTexts[columnId];
    if (!text || !text.trim()) return;
    socket.emit('add_card', {
      columnId,
      content: text.trim(),
      authorName: displayName,
      boardId,
    });
    setCardTexts(prev => ({ ...prev, [columnId]: '' }));
  };

  const handleAddComment = (cardId) => {
    const text = commentTexts[cardId];
    if (!text || !text.trim()) return;
    socket.emit('add_comment', {
      cardId,
      content: text.trim(),
      authorName: displayName,
      boardId,
    });
    setCommentTexts(prev => ({ ...prev, [cardId]: '' }));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const cardId = Number(result.draggableId);
    const newColumnId = Number(result.destination.droppableId);
    const sourceColumnId = Number(result.source.droppableId);
    if (newColumnId === sourceColumnId && result.destination.index === result.source.index) return;

    socket.emit('move_card', { cardId, newColumnId, boardId });
  };

  const handleExport = () => {
    window.open(`/api/boards/${boardId}/export`, '_blank');
  };

  if (showNameModal) {
    return (
      <div className="guest-modal-overlay">
        <div className="guest-modal">
          <h2>Join Board</h2>
          <p>Enter your display name to participate</p>
          <form onSubmit={handleNameSubmit}>
            <input
              type="text"
              placeholder="Your name..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              autoFocus
            />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>
    );
  }

  if (!board) return <div className="loading">Loading...</div>;

  return (
    <>
      <header className="app-header">
        <Link to="/">Retrospective Board</Link>
        <span>Hi, {displayName}</span>
      </header>
      <div className="board-page">
        <div className="board-toolbar">
          <h2>{board.title}</h2>
          <form className="add-column-form" onSubmit={handleAddColumn}>
            <input
              type="text"
              placeholder="New column..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
            />
            <button type="submit">Add Column</button>
          </form>
          <button className="export-btn" onClick={handleExport}>
            Export to CSV
          </button>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="columns-container">
            {board.columns.map((col) => (
              <div className="column" key={col.id}>
                <div className="column-header">{col.title}</div>
                <Droppable droppableId={String(col.id)}>
                  {(provided, snapshot) => (
                    <div
                      className={`column-cards ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {col.cards.map((card, index) => (
                        <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                          {(provided) => (
                            <div
                              className="card"
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <div className="card-content">{card.content}</div>
                              <div className="card-meta">by {card.author_name}</div>
                              <div className="card-actions">
                                <button
                                  onClick={() =>
                                    setExpandedCards(prev => ({
                                      ...prev,
                                      [card.id]: !prev[card.id],
                                    }))
                                  }
                                >
                                  {expandedCards[card.id] ? 'Hide' : 'Comments'} ({(card.comments || []).length})
                                </button>
                              </div>
                              {expandedCards[card.id] && (
                                <div className="comments-section">
                                  {(card.comments || []).map((comment) => (
                                    <div key={comment.id} className="comment">
                                      <span className="comment-author">{comment.author_name}: </span>
                                      {comment.content}
                                    </div>
                                  ))}
                                  <form
                                    className="add-comment-form"
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      handleAddComment(card.id);
                                    }}
                                  >
                                    <input
                                      type="text"
                                      placeholder="Add comment..."
                                      value={commentTexts[card.id] || ''}
                                      onChange={(e) =>
                                        setCommentTexts(prev => ({
                                          ...prev,
                                          [card.id]: e.target.value,
                                        }))
                                      }
                                    />
                                    <button type="submit">Add</button>
                                  </form>
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <div className="add-card-form">
                  <textarea
                    placeholder="Add a card..."
                    value={cardTexts[col.id] || ''}
                    onChange={(e) =>
                      setCardTexts(prev => ({ ...prev, [col.id]: e.target.value }))
                    }
                  />
                  <button onClick={() => handleAddCard(col.id)}>Add Card</button>
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </>
  );
}
