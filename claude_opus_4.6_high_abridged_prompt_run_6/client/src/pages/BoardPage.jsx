import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GuestModal from '../components/GuestModal';
import CardItem from '../components/CardItem';
import CommentPanel from '../components/CommentPanel';
import styles from './BoardPage.module.css';

const COLUMN_COLORS = {
  'went well': '#00d2a0',
  'needs improvement': '#f59e0b',
  'action items': '#6c5ce7',
};

function getColumnColor(title) {
  const key = title.toLowerCase();
  for (const [pattern, color] of Object.entries(COLUMN_COLORS)) {
    if (key.includes(pattern)) return color;
  }
  const hue = [...title].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 55%, 55%)`;
}

export default function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestName, setGuestName] = useState(() => sessionStorage.getItem('retroGuestName') || '');
  const [showGuestModal, setShowGuestModal] = useState(!guestName);
  const [activeCard, setActiveCard] = useState(null);
  const [newCardColumn, setNewCardColumn] = useState(null);
  const [newCardText, setNewCardText] = useState('');
  const socketRef = useRef(null);

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBoard(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!guestName || showGuestModal) return;

    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_board', id);
    });

    socket.on('card_added', (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const columns = prev.columns.map((col) => {
          if (col.id === card.column_id) {
            return { ...col, cards: [...col.cards, card] };
          }
          return col;
        });
        return { ...prev, columns };
      });
    });

    socket.on('card_moved', (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const columns = prev.columns.map((col) => {
          const filtered = col.cards.filter((c) => c.id !== card.id);
          if (col.id === card.column_id) {
            const cards = [...filtered, card].sort((a, b) => a.position - b.position);
            return { ...col, cards };
          }
          return { ...col, cards: filtered };
        });
        return { ...prev, columns };
      });
    });

    socket.on('comment_added', ({ cardId, comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const columns = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            c.id === cardId ? { ...c, comments: [...c.comments, comment] } : c
          ),
        }));
        return { ...prev, columns };
      });
    });

    return () => socket.disconnect();
  }, [id, guestName, showGuestModal]);

  const handleGuestSubmit = (name) => {
    sessionStorage.setItem('retroGuestName', name);
    setGuestName(name);
    setShowGuestModal(false);
  };

  const handleAddCard = (columnId) => {
    if (!newCardText.trim()) return;
    socketRef.current?.emit('add_card', {
      boardId: id,
      columnId,
      content: newCardText.trim(),
      authorName: guestName,
    });
    setNewCardText('');
    setNewCardColumn(null);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    socketRef.current?.emit('move_card', {
      boardId: id,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    });
  };

  const handleAddComment = (cardId, content) => {
    socketRef.current?.emit('add_comment', {
      boardId: id,
      cardId,
      content,
      authorName: guestName,
    });
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  if (showGuestModal) {
    return <GuestModal onSubmit={handleGuestSubmit} />;
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!board) {
    return (
      <div className={styles.errorContainer}>
        <h2>Board not found</h2>
        <Link to="/">Go home</Link>
      </div>
    );
  }

  const activeCardData = activeCard
    ? board.columns.flatMap((c) => c.cards).find((c) => c.id === activeCard)
    : null;

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link to="/" className={styles.backLink}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className={styles.boardTitle}>{board.title}</h1>
        <div className={styles.headerActions}>
          <span className={styles.guestBadge}>{guestName}</span>
          <button className={styles.exportBtn} onClick={handleExport}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export CSV
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.columnsContainer}>
          {board.columns.map((col) => {
            const color = getColumnColor(col.title);
            return (
              <div key={col.id} className={styles.column}>
                <div className={styles.columnHeader}>
                  <div className={styles.columnDot} style={{ background: color }} />
                  <h2 className={styles.columnTitle}>{col.title}</h2>
                  <span className={styles.columnCount}>{col.cards.length}</span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`${styles.cardList} ${snapshot.isDraggingOver ? styles.dragOver : ''}`}
                    >
                      {col.cards.map((card, index) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                            >
                              <CardItem
                                card={card}
                                color={color}
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

                {newCardColumn === col.id ? (
                  <div className={styles.addCardForm}>
                    <textarea
                      className={styles.addCardInput}
                      value={newCardText}
                      onChange={(e) => setNewCardText(e.target.value)}
                      placeholder="What's on your mind?"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddCard(col.id);
                        }
                        if (e.key === 'Escape') {
                          setNewCardColumn(null);
                          setNewCardText('');
                        }
                      }}
                    />
                    <div className={styles.addCardActions}>
                      <button
                        className={styles.addCardSubmit}
                        onClick={() => handleAddCard(col.id)}
                        style={{ background: color }}
                      >
                        Add
                      </button>
                      <button
                        className={styles.addCardCancel}
                        onClick={() => {
                          setNewCardColumn(null);
                          setNewCardText('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={styles.addCardBtn}
                    onClick={() => {
                      setNewCardColumn(col.id);
                      setNewCardText('');
                    }}
                  >
                    <span className={styles.plusIcon}>+</span> Add a card
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {activeCardData && (
        <CommentPanel
          card={activeCardData}
          onClose={() => setActiveCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}
