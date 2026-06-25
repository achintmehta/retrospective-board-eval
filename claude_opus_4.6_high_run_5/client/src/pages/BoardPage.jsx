import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GuestAuthModal from '../components/GuestAuthModal';
import CardItem from '../components/CardItem';
import AddCardForm from '../components/AddCardForm';
import './BoardPage.css';

const socket = io(
  import.meta.env.PROD ? undefined : 'http://localhost:3000',
  { autoConnect: false }
);

function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem('displayName') || ''
  );
  const [showAuth, setShowAuth] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setBoard(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!displayName) {
      setShowAuth(true);
      return;
    }

    socket.connect();
    socket.emit('join_board', id);

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

    socket.on('card_moved', ({ cardId, targetColumnId, card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            let cards = col.cards.filter((c) => c.id !== cardId);
            if (col.id === targetColumnId) {
              const movedCard = { ...card, comments: findCardComments(prev, cardId) };
              cards = [...cards, movedCard];
            }
            return { ...col, cards };
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
            cards: col.cards.map((card) =>
              card.id === cardId
                ? { ...card, comments: [...(card.comments || []), comment] }
                : card
            ),
          })),
        };
      });
    });

    socket.on('column_added', ({ column }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, column] };
      });
    });

    return () => {
      socket.emit('leave_board', id);
      socket.off('card_added');
      socket.off('card_moved');
      socket.off('comment_added');
      socket.off('column_added');
      socket.disconnect();
    };
  }, [id, displayName]);

  function findCardComments(boardState, cardId) {
    for (const col of boardState.columns) {
      const card = col.cards.find((c) => c.id === cardId);
      if (card) return card.comments || [];
    }
    return [];
  }

  function handleAuthSubmit(name) {
    sessionStorage.setItem('displayName', name);
    setDisplayName(name);
    setShowAuth(false);
  }

  function handleAddCard(columnId, content) {
    socket.emit('add_card', {
      columnId,
      content,
      authorName: displayName,
      boardId: id,
    });
  }

  function handleAddComment(cardId, content) {
    socket.emit('add_comment', {
      cardId,
      content,
      authorName: displayName,
      boardId: id,
    });
  }

  function handleDragEnd(result) {
    if (!result.destination) return;

    const sourceColId = Number(result.source.droppableId);
    const destColId = Number(result.destination.droppableId);
    const cardId = Number(result.draggableId);

    if (sourceColId === destColId && result.source.index === result.destination.index) {
      return;
    }

    setBoard((prev) => {
      if (!prev) return prev;
      const newColumns = prev.columns.map((col) => ({ ...col, cards: [...col.cards] }));
      const sourceCol = newColumns.find((c) => c.id === sourceColId);
      const destCol = newColumns.find((c) => c.id === destColId);
      const [moved] = sourceCol.cards.splice(result.source.index, 1);
      destCol.cards.splice(result.destination.index, 0, moved);
      return { ...prev, columns: newColumns };
    });

    socket.emit('move_card', {
      cardId,
      targetColumnId: destColId,
      targetPosition: result.destination.index,
      boardId: id,
    });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    socket.emit('add_column', { boardId: Number(id), title: newColumnTitle.trim() });
    setNewColumnTitle('');
  }

  function handleExport() {
    window.location.href = `/api/boards/${id}/export`;
  }

  if (showAuth) {
    return <GuestAuthModal onSubmit={handleAuthSubmit} />;
  }

  if (loading) {
    return <div className="board-loading">Loading board...</div>;
  }

  if (!board) {
    return <div className="board-loading">Board not found.</div>;
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <h2>{board.title}</h2>
        <div className="toolbar-right">
          <span className="user-badge">{displayName}</span>
          <button className="export-btn" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      <form className="add-column-form" onSubmit={handleAddColumn}>
        <input
          type="text"
          placeholder="New column title..."
          value={newColumnTitle}
          onChange={(e) => setNewColumnTitle(e.target.value)}
        />
        <button type="submit">Add Column</button>
      </form>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns.map((col) => (
            <Droppable key={col.id} droppableId={String(col.id)}>
              {(provided, snapshot) => (
                <div
                  className={`column ${snapshot.isDraggingOver ? 'column-drag-over' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="column-header">
                    <h3>{col.title}</h3>
                    <span className="card-count">{col.cards.length}</span>
                  </div>

                  <div className="cards-list">
                    {col.cards.map((card, index) => (
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
                            className={snapshot.isDragging ? 'card-dragging' : ''}
                          >
                            <CardItem
                              card={card}
                              onAddComment={handleAddComment}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>

                  <AddCardForm
                    onAdd={(content) => handleAddCard(col.id, content)}
                  />
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}

export default BoardPage;
