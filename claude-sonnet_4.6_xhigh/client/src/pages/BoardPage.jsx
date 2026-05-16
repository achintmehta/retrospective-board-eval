import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext } from '@hello-pangea/dnd';
import GuestAuthModal from '../components/GuestAuthModal';
import Column from '../components/Column';

export default function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem('displayName') || ''
  );
  const [showModal, setShowModal] = useState(!sessionStorage.getItem('displayName'));
  const socketRef = useRef(null);

  // Fetch initial board data
  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then((r) => r.json())
      .then((data) => { setBoard(data); setLoading(false); });
  }, [id]);

  // Socket.io connection (only after display name is set)
  useEffect(() => {
    if (!displayName || !id) return;

    const socket = io();
    socketRef.current = socket;

    socket.emit('join_board', { boardId: id, displayName });

    socket.on('card_added', ({ card, columnId }) => {
      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
        )
      }));
    });

    socket.on('card_moved', ({ cardId, targetColumnId, targetPosition }) => {
      setBoard((prev) => {
        let movedCard = null;
        const stripped = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => {
            if (c.id === cardId) { movedCard = c; return false; }
            return true;
          })
        }));
        if (!movedCard) return prev;
        return {
          ...prev,
          columns: stripped.map((col) => {
            if (col.id !== targetColumnId) return col;
            const cards = [...col.cards];
            cards.splice(targetPosition, 0, { ...movedCard, column_id: targetColumnId });
            return { ...col, cards };
          })
        };
      });
    });

    socket.on('comment_added', ({ comment, cardId }) => {
      setBoard((prev) => ({
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card.id === cardId
              ? { ...card, comments: [...(card.comments || []), comment] }
              : card
          )
        }))
      }));
    });

    socket.on('column_added', ({ column }) => {
      setBoard((prev) => ({ ...prev, columns: [...prev.columns, column] }));
    });

    // Refetch full board on reconnect to reconcile any missed events
    socket.on('connect', () => {
      if (socketRef.current?.recovered === false) {
        fetch(`/api/boards/${id}`)
          .then((r) => r.json())
          .then((data) => setBoard(data));
      }
    });

    return () => { socket.disconnect(); socketRef.current = null; };
  }, [displayName, id]);

  const handleLogin = (name) => {
    sessionStorage.setItem('displayName', name);
    setDisplayName(name);
    setShowModal(false);
  };

  const onDragEnd = useCallback(
    (result) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) return;

      socketRef.current?.emit('move_card', {
        boardId: id,
        cardId: draggableId,
        targetColumnId: destination.droppableId,
        targetPosition: destination.index
      });

      // Optimistic local update
      setBoard((prev) => {
        let movedCard = null;
        const stripped = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => {
            if (c.id === draggableId) { movedCard = c; return false; }
            return true;
          })
        }));
        if (!movedCard) return prev;
        return {
          ...prev,
          columns: stripped.map((col) => {
            if (col.id !== destination.droppableId) return col;
            const cards = [...col.cards];
            cards.splice(destination.index, 0, {
              ...movedCard,
              column_id: destination.droppableId
            });
            return { ...col, cards };
          })
        };
      });
    },
    [id]
  );

  const addCard = useCallback(
    (columnId, content) => {
      socketRef.current?.emit('add_card', {
        boardId: id,
        columnId,
        content,
        authorName: displayName
      });
    },
    [id, displayName]
  );

  const addComment = useCallback(
    (cardId, content) => {
      socketRef.current?.emit('add_comment', {
        boardId: id,
        cardId,
        content,
        authorName: displayName
      });
    },
    [id, displayName]
  );

  const addColumn = useCallback(
    (title) => {
      socketRef.current?.emit('add_column', { boardId: id, title });
    },
    [id]
  );

  const exportCsv = () => {
    window.location.href = `/api/boards/${id}/export`;
  };

  if (loading) return <div className="container"><p>Loading board...</p></div>;
  if (!board || board.error) {
    return (
      <div className="container">
        <p>Board not found.</p>
        <Link to="/" style={{ color: '#6366f1' }}>← Go home</Link>
      </div>
    );
  }

  return (
    <>
      {showModal && <GuestAuthModal onLogin={handleLogin} />}
      <div className="board-container">
        <div className="board-header">
          <Link to="/" className="back-link">← Home</Link>
          <h1>{board.title}</h1>
          <button onClick={exportCsv} className="export-btn">Export CSV</button>
        </div>
        {displayName && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="columns-wrapper">
              {board.columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  onAddCard={addCard}
                  onAddComment={addComment}
                />
              ))}
              <AddColumnForm onAddColumn={addColumn} />
            </div>
          </DragDropContext>
        )}
      </div>
    </>
  );
}

function AddColumnForm({ onAddColumn }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddColumn(title.trim());
    setTitle('');
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="add-column-placeholder">
        <button onClick={() => setOpen(true)}>+ Add Column</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="add-column-form">
      <input
        autoFocus
        type="text"
        placeholder="Column title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="btn-row">
        <button type="submit">Add</button>
        <button type="button" className="btn-cancel" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
