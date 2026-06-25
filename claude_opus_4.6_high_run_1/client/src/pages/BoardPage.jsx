import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GuestModal from '../components/GuestModal.jsx';
import Column from '../components/Column.jsx';
import CardModal from '../components/CardModal.jsx';
import './BoardPage.css';

function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [socket, setSocket] = useState(null);
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem('retroDisplayName') || ''
  );
  const [selectedCard, setSelectedCard] = useState(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/boards/${id}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) throw new Error('Response was not JSON');
        return res.json();
      })
      .then(data => { if (!cancelled) setBoard(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!displayName) return;

    const s = io({ transports: ['websocket', 'polling'] });
    s.emit('join_board', id);
    setSocket(s);

    s.on('card_added', ({ columnId, card }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === columnId
              ? { ...col, cards: [...col.cards, card] }
              : col
          ),
        };
      });
    });

    s.on('card_moved', ({ cardId, targetColumnId, card }) => {
      setBoard(prev => {
        if (!prev) return prev;
        const columns = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => c.id !== cardId),
        }));
        return {
          ...prev,
          columns: columns.map(col =>
            col.id === targetColumnId
              ? {
                  ...col,
                  cards: [...col.cards, card].sort((a, b) => a.position - b.position),
                }
              : col
          ),
        };
      });
    });

    s.on('column_added', ({ column }) => {
      setBoard(prev => {
        if (!prev) return prev;
        if (prev.columns.some(c => c.id === column.id)) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: [] }],
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
              c.id === cardId
                ? { ...c, comments: [...c.comments, comment] }
                : c
            ),
          })),
        };
      });
      setSelectedCard(prev => {
        if (prev && prev.id === cardId) {
          return { ...prev, comments: [...prev.comments, comment] };
        }
        return prev;
      });
    });

    return () => {
      s.emit('leave_board', id);
      s.disconnect();
    };
  }, [id, displayName]);

  const handleJoin = (name) => {
    sessionStorage.setItem('retroDisplayName', name);
    setDisplayName(name);
  };

  const handleAddCard = useCallback((columnId, content) => {
    if (!socket) return;
    socket.emit('add_card', {
      columnId,
      content,
      authorName: displayName,
      boardId: id,
    });
  }, [socket, displayName, id]);

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !socket) return;

    const { draggableId, destination } = result;
    const cardId = Number(draggableId);
    const targetColumnId = Number(destination.droppableId);
    const targetPosition = destination.index;

    socket.emit('move_card', {
      cardId,
      targetColumnId,
      targetPosition,
      boardId: id,
    });
  }, [socket, id]);

  const handleAddComment = useCallback((cardId, content) => {
    if (!socket) return;
    socket.emit('add_comment', {
      cardId,
      content,
      authorName: displayName,
      boardId: id,
    });
  }, [socket, displayName, id]);

  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() }),
    });
    setNewColumnTitle('');
  };

  const handleExport = () => {
    window.location.href = `/api/boards/${id}/export`;
  };

  if (error) {
    return (
      <div className="loading">
        <p>Failed to load board: {error}</p>
        <button onClick={() => navigate('/')}>Back to boards</button>
      </div>
    );
  }

  if (!displayName) {
    return <GuestModal onJoin={handleJoin} />;
  }

  if (!board) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            &larr; Boards
          </button>
          <h1>{board.title}</h1>
        </div>
        <div className="board-header-right">
          <span className="user-badge">{displayName}</span>
          <button className="export-btn" onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onSelectCard={setSelectedCard}
            />
          ))}
          <form className="add-column-form" onSubmit={handleAddColumn}>
            <input
              type="text"
              placeholder="New column..."
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
            />
            <button type="submit">+ Add</button>
          </form>
        </div>
      </DragDropContext>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}

export default BoardPage;
