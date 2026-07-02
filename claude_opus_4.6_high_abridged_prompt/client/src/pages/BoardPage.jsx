import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { api } from '../api';
import { socket } from '../socket';
import GuestAuthModal from '../components/GuestAuthModal';
import CommentModal from '../components/CommentModal';

const COLUMN_COLORS = [
  { bg: 'rgba(0, 184, 148, 0.06)', border: 'rgba(0, 184, 148, 0.25)', accent: '#00b894' },
  { bg: 'rgba(253, 203, 110, 0.06)', border: 'rgba(253, 203, 110, 0.25)', accent: '#fdcb6e' },
  { bg: 'rgba(108, 92, 231, 0.06)', border: 'rgba(108, 92, 231, 0.25)', accent: '#6c5ce7' },
  { bg: 'rgba(232, 67, 147, 0.06)', border: 'rgba(232, 67, 147, 0.25)', accent: '#e84393' },
  { bg: 'rgba(116, 185, 255, 0.06)', border: 'rgba(116, 185, 255, 0.25)', accent: '#74b9ff' },
];

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [userName, setUserName] = useState(() => sessionStorage.getItem('retroUser') || '');
  const [showAuth, setShowAuth] = useState(false);
  const [newCardText, setNewCardText] = useState({});
  const [commentCard, setCommentCard] = useState(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(async () => {
    try {
      const data = await api.getBoard(id);
      setBoard(data);
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!userName) {
      setShowAuth(true);
      return;
    }
    setShowAuth(false);
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

    socket.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard = null;
        const columnsWithout = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => {
            if (c.id === cardId) { movedCard = c; return false; }
            return true;
          }),
        }));
        if (!movedCard) return prev;
        return {
          ...prev,
          columns: columnsWithout.map((col) => {
            if (col.id === newColumnId) {
              const cards = [...col.cards];
              cards.splice(newPosition, 0, { ...movedCard, column_id: newColumnId });
              return { ...col, cards };
            }
            return col;
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
      setCommentCard((prev) =>
        prev && prev.id === cardId
          ? { ...prev, comments: [...(prev.comments || []), comment] }
          : prev
      );
    });

    return () => {
      socket.off('card_added');
      socket.off('card_moved');
      socket.off('comment_added');
      socket.disconnect();
    };
  }, [id, userName]);

  const handleJoin = (name) => {
    sessionStorage.setItem('retroUser', name);
    setUserName(name);
  };

  const handleAddCard = (columnId) => {
    const text = newCardText[columnId];
    if (!text || !text.trim()) return;
    socket.emit('add_card', {
      boardId: id,
      columnId,
      content: text.trim(),
      authorName: userName,
    });
    setNewCardText((prev) => ({ ...prev, [columnId]: '' }));
  };

  const handleAddComment = (cardId, content) => {
    socket.emit('add_comment', {
      boardId: id,
      cardId,
      content,
      authorName: userName,
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    socket.emit('move_card', {
      boardId: id,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    });

    setBoard((prev) => {
      if (!prev) return prev;
      let movedCard = null;
      const columnsWithout = prev.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => {
          if (c.id === draggableId) { movedCard = c; return false; }
          return true;
        }),
      }));
      if (!movedCard) return prev;
      return {
        ...prev,
        columns: columnsWithout.map((col) => {
          if (col.id === destination.droppableId) {
            const cards = [...col.cards];
            cards.splice(destination.index, 0, { ...movedCard, column_id: destination.droppableId });
            return { ...col, cards };
          }
          return col;
        }),
      };
    });
  };

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return;
    await api.createColumn(id, newColumnTitle.trim());
    setNewColumnTitle('');
    setAddingColumn(false);
    fetchBoard();
  };

  const openComments = (card) => {
    setCommentCard(card);
  };

  if (loading) {
    return (
      <div style={s.loadingContainer}>
        <div style={s.spinner} />
      </div>
    );
  }

  if (showAuth) {
    return <GuestAuthModal onJoin={handleJoin} />;
  }

  if (!board) return null;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button
            style={s.backBtn}
            onClick={() => navigate('/')}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 style={s.boardTitle}>{board.title}</h1>
            <span style={s.userBadge}>
              <span style={s.onlineDot} />
              {userName}
            </span>
          </div>
        </div>
        <div style={s.headerRight}>
          <button
            style={s.addColumnBtn}
            onClick={() => setAddingColumn(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-focus)';
              e.currentTarget.style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-card)';
            }}
          >
            + Column
          </button>
          <a
            href={api.getExportUrl(id)}
            style={s.exportBtn}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 184, 148, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export CSV
          </a>
        </div>
      </header>

      {addingColumn && (
        <div style={s.addColumnForm}>
          <input
            style={s.addColumnInput}
            placeholder="Column title..."
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--border-focus)';
              e.target.style.boxShadow = '0 0 0 3px var(--accent-glow)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button style={s.addColumnConfirm} onClick={handleAddColumn}>Add</button>
          <button
            style={s.addColumnCancel}
            onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }}
          >
            Cancel
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={s.columnsContainer}>
          {board.columns.map((col, colIdx) => {
            const color = COLUMN_COLORS[colIdx % COLUMN_COLORS.length];
            return (
              <div key={col.id} style={{ ...s.column, background: color.bg, borderColor: color.border }}>
                <div style={s.columnHeader}>
                  <div style={{ ...s.columnDot, background: color.accent }} />
                  <h3 style={s.columnTitle}>{col.title}</h3>
                  <span style={s.cardCount}>{col.cards.length}</span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        ...s.cardsList,
                        background: snapshot.isDraggingOver ? 'rgba(108, 92, 231, 0.05)' : 'transparent',
                        borderRadius: 'var(--radius-md)',
                        transition: 'background var(--transition)',
                        minHeight: 60,
                      }}
                    >
                      {col.cards.map((card, cardIdx) => (
                        <Draggable key={card.id} draggableId={card.id} index={cardIdx}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              style={{
                                ...s.card,
                                ...(snap.isDragging ? s.cardDragging : {}),
                                ...prov.draggableProps.style,
                              }}
                              onClick={() => openComments(card)}
                              onMouseEnter={(e) => {
                                if (!snap.isDragging) {
                                  e.currentTarget.style.borderColor = color.accent;
                                  e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!snap.isDragging) {
                                  e.currentTarget.style.borderColor = 'var(--border)';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }
                              }}
                            >
                              <p style={s.cardContent}>{card.content}</p>
                              <div style={s.cardFooter}>
                                <span style={s.cardAuthor}>{card.author_name}</span>
                                <span style={s.commentCount}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  {card.comments?.length || 0}
                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <div style={s.addCardSection}>
                  <textarea
                    style={s.addCardInput}
                    placeholder="Add a card..."
                    value={newCardText[col.id] || ''}
                    onChange={(e) => setNewCardText((prev) => ({ ...prev, [col.id]: e.target.value }))}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddCard(col.id);
                      }
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = color.accent;
                      e.target.style.boxShadow = `0 0 0 3px ${color.accent}22`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--border)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    style={{ ...s.addCardBtn, background: color.accent }}
                    onClick={() => handleAddCard(col.id)}
                    onMouseEnter={(e) => { e.target.style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
                  >
                    + Add Card
                  </button>
                </div>
              </div>
            );
          })}

          {board.columns.length === 0 && (
            <div style={s.emptyState}>
              <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
                No columns yet. Click "+ Column" to add your first column.
              </p>
            </div>
          )}
        </div>
      </DragDropContext>

      {commentCard && (
        <CommentModal
          card={commentCard}
          onClose={() => setCommentCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #0f0f13 0%, #12121a 100%)',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'rgba(15, 15, 19, 0.8)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all var(--transition)',
  },
  boardTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  userBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#00b894',
    boxShadow: '0 0 6px rgba(0, 184, 148, 0.5)',
  },
  headerRight: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
  },
  addColumnBtn: {
    padding: '8px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition)',
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #00b894, #00a884)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'all var(--transition)',
  },
  addColumnForm: {
    display: 'flex',
    gap: 8,
    padding: '12px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-secondary)',
  },
  addColumnInput: {
    flex: 1,
    maxWidth: 300,
    padding: '8px 14px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 14,
    transition: 'border-color var(--transition), box-shadow var(--transition)',
  },
  addColumnConfirm: {
    padding: '8px 16px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  addColumnCancel: {
    padding: '8px 16px',
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    cursor: 'pointer',
  },
  columnsContainer: {
    display: 'flex',
    gap: 16,
    padding: 24,
    flex: 1,
    overflowX: 'auto',
    alignItems: 'flex-start',
  },
  column: {
    flex: '0 0 320px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 100px)',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  columnDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  cardCount: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.06)',
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
  },
  cardsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingBottom: 8,
  },
  card: {
    padding: '14px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    boxShadow: 'var(--shadow-sm)',
  },
  cardDragging: {
    boxShadow: 'var(--shadow-lg)',
    transform: 'rotate(2deg)',
    opacity: 0.95,
  },
  cardContent: {
    fontSize: 14,
    color: 'var(--text-primary)',
    lineHeight: 1.5,
    margin: 0,
    wordBreak: 'break-word',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  cardAuthor: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  commentCount: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  addCardSection: {
    marginTop: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  addCardInput: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 13,
    resize: 'none',
    transition: 'border-color var(--transition), box-shadow var(--transition)',
    lineHeight: 1.4,
  },
  addCardBtn: {
    padding: '8px 14px',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity var(--transition)',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
};
