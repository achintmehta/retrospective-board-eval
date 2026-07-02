import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import GuestAuthModal from '../components/GuestAuthModal';
import CardModal from '../components/CardModal';
import AddColumnForm from '../components/AddColumnForm';

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #0f1117 0%, #141824 100%)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 28px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(15, 17, 23, 0.8)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  backBtn: {
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  boardTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #e8eaed 0%, #9aa0b0 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  topBarActions: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  exportBtn: {
    background: 'var(--bg-card)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 16px',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  userBadge: {
    background: 'var(--bg-elevated)',
    color: 'var(--accent)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '6px 16px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  board: {
    flex: 1,
    display: 'flex',
    gap: 20,
    padding: '24px 28px',
    overflowX: 'auto',
    alignItems: 'flex-start',
  },
  column: {
    minWidth: 300,
    maxWidth: 340,
    flex: '0 0 300px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 120px)',
  },
  columnHeader: {
    padding: '16px 20px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border)',
  },
  columnTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'var(--text-primary)',
  },
  columnCount: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
    borderRadius: '12px',
    padding: '2px 10px',
  },
  cardList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 60,
  },
  card: {
    background: 'var(--gradient-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '14px 16px',
    cursor: 'grab',
    transition: 'all 0.15s ease',
    position: 'relative',
  },
  cardDragging: {
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid var(--accent)',
    transform: 'rotate(2deg)',
  },
  cardContent: {
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    marginBottom: 8,
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  commentCount: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    color: 'var(--text-muted)',
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '0.75rem',
    fontFamily: 'inherit',
  },
  addCardArea: {
    padding: '0 12px 12px',
  },
  addCardBtn: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  addCardForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  addCardTextarea: {
    resize: 'none',
    minHeight: 70,
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xs)',
    color: 'var(--text-primary)',
    padding: '10px 12px',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    outline: 'none',
  },
  addCardActions: {
    display: 'flex',
    gap: 8,
  },
  addCardSubmit: {
    padding: '8px 18px',
    background: 'var(--gradient-accent)',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.82rem',
    borderRadius: 'var(--radius-xs)',
    border: 'none',
  },
  addCardCancel: {
    padding: '8px 14px',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontWeight: 500,
    fontSize: '0.82rem',
    borderRadius: 'var(--radius-xs)',
    border: '1px solid var(--border)',
  },
  loading: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: '1rem',
  },
};

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [userName, setUserName] = useState(() => sessionStorage.getItem('retroUserName') || '');
  const [socket, setSocket] = useState(null);
  const [addingCardCol, setAddingCardCol] = useState(null);
  const [newCardText, setNewCardText] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(true);

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
    if (!userName) return;

    const s = io({ transports: ['websocket', 'polling'] });
    setSocket(s);
    s.emit('join_board', id);

    s.on('card_added', (card) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const cols = prev.columns.map((col) => {
          if (col.id === card.column_id) {
            return { ...col, cards: [...col.cards, { ...card, comments: [] }] };
          }
          return col;
        });
        return { ...prev, columns: cols };
      });
    });

    s.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard = null;
        const cleaned = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => {
            if (c.id === cardId) {
              movedCard = c;
              return false;
            }
            return true;
          }),
        }));
        if (!movedCard) return prev;
        const cols = cleaned.map((col) => {
          if (col.id === newColumnId) {
            const cards = [...col.cards];
            movedCard = { ...movedCard, column_id: newColumnId, position: newPosition };
            cards.splice(newPosition, 0, movedCard);
            return { ...col, cards };
          }
          return col;
        });
        return { ...prev, columns: cols };
      });
    });

    s.on('comment_added', (comment) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const cols = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) => {
            if (card.id === comment.card_id) {
              return { ...card, comments: [...(card.comments || []), comment] };
            }
            return card;
          }),
        }));
        return { ...prev, columns: cols };
      });
      setSelectedCard((prev) => {
        if (prev && prev.id === comment.card_id) {
          return { ...prev, comments: [...(prev.comments || []), comment] };
        }
        return prev;
      });
    });

    s.on('column_added', (column) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] };
      });
    });

    return () => s.disconnect();
  }, [userName, id]);

  const handleJoin = (name) => {
    sessionStorage.setItem('retroUserName', name);
    setUserName(name);
  };

  const handleAddCard = (columnId) => {
    if (!newCardText.trim() || !socket) return;
    socket.emit('add_card', {
      columnId,
      content: newCardText.trim(),
      authorName: userName,
    });
    setNewCardText('');
    setAddingCardCol(null);
  };

  const handleDragEnd = (result) => {
    if (!result.destination || !socket) return;
    const { draggableId, destination } = result;
    socket.emit('move_card', {
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    });

    setBoard((prev) => {
      if (!prev) return prev;
      let movedCard = null;
      const cleaned = prev.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => {
          if (c.id === draggableId) {
            movedCard = c;
            return false;
          }
          return true;
        }),
      }));
      if (!movedCard) return prev;
      const cols = cleaned.map((col) => {
        if (col.id === destination.droppableId) {
          const cards = [...col.cards];
          movedCard = { ...movedCard, column_id: destination.droppableId, position: destination.index };
          cards.splice(destination.index, 0, movedCard);
          return { ...col, cards };
        }
        return col;
      });
      return { ...prev, columns: cols };
    });
  };

  const handleAddComment = (cardId, content) => {
    if (!socket) return;
    socket.emit('add_comment', {
      cardId,
      content,
      authorName: userName,
    });
  };

  const handleAddColumn = (title) => {
    if (!socket) return;
    socket.emit('add_column', { boardId: id, title });
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  if (!userName) {
    return <GuestAuthModal onSubmit={handleJoin} />;
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading board...</div>
      </div>
    );
  }

  if (!board) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Board not found.</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button
          style={styles.backBtn}
          onClick={() => navigate('/')}
          onMouseEnter={(e) => (e.target.style.borderColor = 'var(--border-hover)')}
          onMouseLeave={(e) => (e.target.style.borderColor = 'var(--border)')}
        >
          &larr; Boards
        </button>
        <div style={styles.boardTitle}>{board.title}</div>
        <div style={styles.topBarActions}>
          <button
            style={styles.exportBtn}
            onClick={handleExport}
            onMouseEnter={(e) => (e.target.style.borderColor = 'var(--border-hover)')}
            onMouseLeave={(e) => (e.target.style.borderColor = 'var(--border)')}
          >
            Export CSV
          </button>
          <div style={styles.userBadge}>{userName}</div>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={styles.board}>
          {board.columns.map((column) => (
            <div key={column.id} style={styles.column}>
              <div style={styles.columnHeader}>
                <div style={styles.columnTitle}>{column.title}</div>
                <div style={styles.columnCount}>{column.cards.length}</div>
              </div>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={styles.cardList}
                  >
                    {column.cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...styles.card,
                              ...(snapshot.isDragging ? styles.cardDragging : {}),
                              ...provided.draggableProps.style,
                            }}
                            onMouseEnter={(e) => {
                              if (!snapshot.isDragging) {
                                e.currentTarget.style.borderColor = 'var(--border-hover)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!snapshot.isDragging) {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            <div style={styles.cardContent}>{card.content}</div>
                            <div style={styles.cardMeta}>
                              <span>{card.author_name}</span>
                              <button
                                style={styles.commentCount}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCard(card);
                                }}
                              >
                                <span>&#128172;</span> {card.comments?.length || 0}
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
              <div style={styles.addCardArea}>
                {addingCardCol === column.id ? (
                  <div style={styles.addCardForm}>
                    <textarea
                      style={styles.addCardTextarea}
                      placeholder="Write your thought..."
                      value={newCardText}
                      onChange={(e) => setNewCardText(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddCard(column.id);
                        }
                      }}
                    />
                    <div style={styles.addCardActions}>
                      <button style={styles.addCardSubmit} onClick={() => handleAddCard(column.id)}>
                        Add Card
                      </button>
                      <button
                        style={styles.addCardCancel}
                        onClick={() => {
                          setAddingCardCol(null);
                          setNewCardText('');
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    style={styles.addCardBtn}
                    onClick={() => setAddingCardCol(column.id)}
                    onMouseEnter={(e) => (e.target.style.borderColor = 'var(--text-muted)')}
                    onMouseLeave={(e) => (e.target.style.borderColor = 'var(--border)')}
                  >
                    + Add a card
                  </button>
                )}
              </div>
            </div>
          ))}
          <AddColumnForm onAdd={handleAddColumn} />
        </div>
      </DragDropContext>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
          userName={userName}
        />
      )}
    </div>
  );
}
