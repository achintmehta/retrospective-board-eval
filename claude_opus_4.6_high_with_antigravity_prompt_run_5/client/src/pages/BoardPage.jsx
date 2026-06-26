import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CardItem from '../components/CardItem';
import GuestModal from '../components/GuestModal';

export default function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem('retro_display_name') || ''
  );
  const [showModal, setShowModal] = useState(!displayName);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setBoard(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!displayName) return;

    const s = io({ transports: ['websocket', 'polling'] });
    setSocket(s);

    s.emit('join_board', { boardId: id, displayName });

    s.on('card_added', (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const columns = prev.columns.map((col) => {
          if (col.id === card.column_id) {
            return { ...col, cards: [...col.cards, { ...card, comments: [] }] };
          }
          return col;
        });
        return { ...prev, columns };
      });
    });

    s.on('card_moved', ({ cardId, fromColumnId, toColumnId, newPosition }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard = null;
        const columns = prev.columns.map((col) => {
          if (col.id === fromColumnId) {
            const filtered = col.cards.filter((c) => {
              if (c.id === cardId) {
                movedCard = c;
                return false;
              }
              return true;
            });
            return { ...col, cards: filtered };
          }
          return col;
        });
        if (!movedCard) return prev;
        movedCard = { ...movedCard, column_id: toColumnId, position: newPosition };
        return {
          ...prev,
          columns: columns.map((col) => {
            if (col.id === toColumnId) {
              const cards = [...col.cards, movedCard].sort(
                (a, b) => a.position - b.position
              );
              return { ...col, cards };
            }
            return col;
          }),
        };
      });
    });

    s.on('comment_added', (comment) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const columns = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) => {
            if (card.id === comment.card_id) {
              return { ...card, comments: [...card.comments, comment] };
            }
            return card;
          }),
        }));
        return { ...prev, columns };
      });
    });

    s.on('column_added', (column) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] };
      });
    });

    s.on('reconnect', () => {
      fetchBoard();
      s.emit('join_board', { boardId: id, displayName });
    });

    return () => s.disconnect();
  }, [id, displayName, fetchBoard]);

  const handleJoin = (name) => {
    sessionStorage.setItem('retro_display_name', name);
    setDisplayName(name);
    setShowModal(false);
  };

  const handleAddCard = (columnId, content) => {
    if (!socket) return;
    socket.emit('add_card', {
      boardId: id,
      columnId,
      content,
      authorName: displayName,
    });
  };

  const handleAddComment = (cardId, content) => {
    if (!socket) return;
    socket.emit('add_comment', {
      cardId,
      content,
      authorName: displayName,
    });
  };

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() }),
    }).then((res) => {
      if (res.ok) {
        res.json().then((col) => {
          setBoard((prev) => ({
            ...prev,
            columns: [...prev.columns, { ...col, cards: [] }],
          }));
          if (socket) {
            socket.emit('add_column', { boardId: id, column: col });
          }
        });
        setNewColumnTitle('');
      }
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination || !socket) return;

    const { draggableId, source, destination } = result;
    const fromColumnId = Number(source.droppableId);
    const toColumnId = Number(destination.droppableId);
    const cardId = Number(draggableId);

    if (fromColumnId === toColumnId && source.index === destination.index) return;

    setBoard((prev) => {
      if (!prev) return prev;
      let movedCard = null;
      const columns = prev.columns.map((col) => {
        if (col.id === fromColumnId) {
          const cards = [...col.cards];
          const [removed] = cards.splice(source.index, 1);
          movedCard = removed;
          return { ...col, cards };
        }
        return col;
      });
      if (!movedCard) return prev;
      return {
        ...prev,
        columns: columns.map((col) => {
          if (col.id === toColumnId) {
            const cards = [...col.cards];
            cards.splice(destination.index, 0, {
              ...movedCard,
              column_id: toColumnId,
              position: destination.index,
            });
            return { ...col, cards };
          }
          return col;
        }),
      };
    });

    socket.emit('move_card', {
      cardId,
      fromColumnId,
      toColumnId,
      newPosition: destination.index,
    });
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  if (showModal) {
    return <GuestModal onJoin={handleJoin} />;
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner" />
          Loading board...
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="page-container">
        <div className="loading">Board not found.</div>
      </div>
    );
  }

  const columnColors = [
    'var(--column-went-well)',
    'var(--column-improve)',
    'var(--column-action)',
    'var(--column-default)',
  ];

  return (
    <div className="page-container">
      <div className="board-header">
        <div className="board-header-left">
          <Link to="/" className="btn-secondary" id="back-home-btn">
            ← Home
          </Link>
          <h2>{board.title}</h2>
        </div>
        <div className="board-header-right">
          <div className="user-badge">
            <span className="dot" />
            {displayName}
          </div>
          <button
            className="btn-secondary"
            onClick={handleExport}
            id="export-csv-btn"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="add-column-area">
        <form onSubmit={handleAddColumn} style={{ display: 'flex', gap: '8px' }}>
          <input
            id="add-column-input"
            type="text"
            placeholder="New column name..."
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
          />
          <button type="submit" className="btn-sm primary" id="add-column-btn">
            Add Column
          </button>
        </form>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns.map((column, colIdx) => (
            <div className="column" key={column.id}>
              <div
                className="column-header"
                style={{
                  borderBottom: `2px solid ${columnColors[colIdx % columnColors.length]}`,
                }}
              >
                <h3
                  style={{
                    color: columnColors[colIdx % columnColors.length],
                  }}
                >
                  {column.title}
                </h3>
                <span className="card-count">{column.cards.length}</span>
              </div>
              <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                  <div
                    className="column-cards"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      background: snapshot.isDraggingOver
                        ? 'rgba(102, 126, 234, 0.05)'
                        : undefined,
                    }}
                  >
                    {column.cards.map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={String(card.id)}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <CardItem
                              card={card}
                              isDragging={snapshot.isDragging}
                              onAddComment={handleAddComment}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <AddCardFooter
                columnId={column.id}
                onAddCard={handleAddCard}
              />
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

function AddCardFooter({ columnId, onAddCard }) {
  const [isAdding, setIsAdding] = useState(false);
  const [content, setContent] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddCard(columnId, content.trim());
    setContent('');
    setIsAdding(false);
  };

  if (!isAdding) {
    return (
      <div className="column-footer">
        <button
          className="add-card-btn"
          onClick={() => setIsAdding(true)}
          id={`add-card-btn-${columnId}`}
        >
          + Add a card
        </button>
      </div>
    );
  }

  return (
    <div className="column-footer">
      <form className="add-card-form" onSubmit={handleSubmit}>
        <textarea
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
          id={`card-textarea-${columnId}`}
        />
        <div className="form-actions">
          <button type="submit" className="btn-sm primary">
            Add
          </button>
          <button
            type="button"
            className="btn-sm ghost"
            onClick={() => {
              setIsAdding(false);
              setContent('');
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
