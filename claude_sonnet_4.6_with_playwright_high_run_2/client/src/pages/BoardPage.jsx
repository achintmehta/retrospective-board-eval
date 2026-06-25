import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext } from '@hello-pangea/dnd';
import GuestAuthModal from '../components/GuestAuthModal';
import Column from '../components/Column';
import CommentModal from '../components/CommentModal';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : '/';

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [cards, setCards] = useState([]);
  const [comments, setComments] = useState([]);
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('retro_display_name'));
  const [socket, setSocket] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [error, setError] = useState(null);

  // Task 4.3: Fetch and display board data
  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Board not found');
        return r.json();
      })
      .then(data => {
        setBoard(data);
        setColumns(data.columns);
        setCards(data.cards);
        setComments(data.comments);
      })
      .catch(() => {
        setError('Board not found.');
        setTimeout(() => navigate('/'), 2000);
      });
  }, [id, navigate]);

  // Task 6.1: Socket.io integration
  useEffect(() => {
    if (!displayName) return;

    const sock = io(SOCKET_URL);

    // Task 5.2: Join board room
    sock.emit('join_board', id);

    // Task 5.3: Receive card_added
    sock.on('card_added', card => {
      setCards(prev => [...prev, card]);
    });

    // Task 5.4: Receive card_moved
    sock.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setCards(prev =>
        prev.map(c => c.id === cardId ? { ...c, column_id: newColumnId, position: newPosition } : c)
      );
    });

    // Task 5.5: Receive comment_added
    sock.on('comment_added', comment => {
      setComments(prev => [...prev, comment]);
    });

    sock.on('column_added', column => {
      setColumns(prev => [...prev, column]);
    });

    // On reconnect, refetch the full board state
    sock.on('connect', () => {
      sock.emit('join_board', id);
      fetch(`/api/boards/${id}`)
        .then(r => r.json())
        .then(data => {
          setColumns(data.columns);
          setCards(data.cards);
          setComments(data.comments);
        })
        .catch(() => {});
    });

    setSocket(sock);
    return () => sock.disconnect();
  }, [id, displayName]);

  const handleAddCard = useCallback((columnId, content) => {
    if (!socket) return;
    socket.emit('add_card', { boardId: id, columnId, content, authorName: displayName });
  }, [socket, id, displayName]);

  // Task 6.3: Drag-and-drop handler
  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !socket) return;
    const { draggableId, destination } = result;
    const newColumnId = destination.droppableId;
    const newPosition = destination.index;

    // Optimistic update
    setCards(prev =>
      prev.map(c => c.id === draggableId ? { ...c, column_id: newColumnId, position: newPosition } : c)
    );

    socket.emit('move_card', { boardId: id, cardId: draggableId, newColumnId, newPosition });
  }, [socket, id]);

  // Task 6.5: Add comment
  const handleAddComment = useCallback((cardId, content) => {
    if (!socket) return;
    socket.emit('add_comment', { boardId: id, cardId, content, authorName: displayName });
  }, [socket, id, displayName]);

  const handleAddColumn = (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim() || !socket) return;
    socket.emit('add_column', { boardId: id, title: newColumnTitle.trim() });
    setNewColumnTitle('');
    setShowAddColumn(false);
  };

  // Task 7.2: Export CSV
  const handleExport = () => {
    window.location.href = `/api/boards/${id}/export`;
  };

  const handleJoin = (name) => {
    sessionStorage.setItem('retro_display_name', name);
    setDisplayName(name);
  };

  if (error) {
    return <div style={{ padding: '2rem', color: '#c00' }}>{error} Redirecting...</div>;
  }

  if (!board) {
    return <div style={{ padding: '2rem', color: '#999' }}>Loading...</div>;
  }

  // Task 4.4: Guest auth modal
  if (!displayName) {
    return <GuestAuthModal onSubmit={handleJoin} />;
  }

  // Derive per-column card lists (sorted by position)
  const cardsByColumn = {};
  for (const col of columns) {
    cardsByColumn[col.id] = cards
      .filter(c => c.column_id === col.id)
      .sort((a, b) => a.position - b.position);
  }

  // Derive per-card comment lists
  const commentsByCard = {};
  for (const comment of comments) {
    if (!commentsByCard[comment.card_id]) commentsByCard[comment.card_id] = [];
    commentsByCard[comment.card_id].push(comment);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f0f2f5' }}>
      {/* Header */}
      <div style={{
        background: '#4f46e5',
        color: '#fff',
        padding: '0.875rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '0.3rem 0.75rem',
            fontSize: '0.875rem',
          }}
        >
          ← Back
        </button>
        <h1 style={{ flex: 1, fontSize: '1.25rem', fontWeight: 700 }}>{board.title}</h1>
        <span style={{ fontSize: '0.8125rem', opacity: 0.75 }}>Joined as: {displayName}</span>
        <button
          onClick={handleExport}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '0.3rem 0.75rem',
            fontSize: '0.875rem',
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Task 6.2: Board columns with drag-and-drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          overflowX: 'auto',
          flex: 1,
          alignItems: 'flex-start',
        }}>
          {columns.map(col => (
            <Column
              key={col.id}
              column={col}
              cards={cardsByColumn[col.id] || []}
              onAddCard={handleAddCard}
              onCardClick={card => setSelectedCard(card)}
              commentCounts={commentsByCard}
            />
          ))}

          {/* Add column panel */}
          <div style={{
            minWidth: 280,
            background: 'rgba(235,236,240,0.7)',
            borderRadius: 8,
            padding: '0.75rem',
            flexShrink: 0,
          }}>
            {showAddColumn ? (
              <form onSubmit={handleAddColumn}>
                <input
                  autoFocus
                  value={newColumnTitle}
                  onChange={e => setNewColumnTitle(e.target.value)}
                  placeholder="Column title..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1.5px solid #ccc',
                    borderRadius: 4,
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      background: '#4f46e5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '0.375rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  >
                    Add Column
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddColumn(false); setNewColumnTitle(''); }}
                    style={{ background: '#e0e0e0', border: 'none', borderRadius: 4, padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddColumn(true)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: '2px dashed #c1c7d0',
                  borderRadius: 6,
                  padding: '0.75rem',
                  color: '#44546f',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                + Add Column
              </button>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* Task 6.5: Comment modal */}
      {selectedCard && (
        <CommentModal
          card={selectedCard}
          comments={commentsByCard[selectedCard.id] || []}
          onAddComment={handleAddComment}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
