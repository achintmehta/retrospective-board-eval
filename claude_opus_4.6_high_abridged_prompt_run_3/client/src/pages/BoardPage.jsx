import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { io } from 'socket.io-client'
import GuestModal from '../components/GuestModal.jsx'
import CardItem from '../components/CardItem.jsx'
import CommentPanel from '../components/CommentPanel.jsx'
import AddColumnForm from '../components/AddColumnForm.jsx'

export default function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState(() => sessionStorage.getItem('retro_username') || '')
  const [showGuestModal, setShowGuestModal] = useState(!username)
  const [selectedCard, setSelectedCard] = useState(null)
  const [newCardText, setNewCardText] = useState({})
  const socketRef = useRef(null)

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(r => r.json())
      .then(data => { setBoard(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => socket.emit('join_board', id))

    socket.on('card_added', (card) => {
      setBoard(prev => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === card.column_id
              ? { ...col, cards: [...col.cards, card] }
              : col
          ),
        }
      })
    })

    socket.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoard(prev => {
        if (!prev) return prev
        let movedCard = null
        const withoutCard = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => {
            if (c.id === cardId) { movedCard = c; return false }
            return true
          }),
        }))
        if (!movedCard) return prev
        movedCard = { ...movedCard, column_id: newColumnId, position: newPosition }
        return {
          ...prev,
          columns: withoutCard.map(col =>
            col.id === newColumnId
              ? { ...col, cards: [...col.cards, movedCard].sort((a, b) => a.position - b.position) }
              : col
          ),
        }
      })
    })

    socket.on('comment_added', (comment) => {
      setBoard(prev => {
        if (!prev) return prev
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
        }
      })
      setSelectedCard(prev => {
        if (prev && prev.id === comment.card_id) {
          return { ...prev, comments: [...(prev.comments || []), comment] }
        }
        return prev
      })
    })

    socket.on('column_added', (col) => {
      setBoard(prev => {
        if (!prev) return prev
        return { ...prev, columns: [...prev.columns, col] }
      })
    })

    return () => socket.disconnect()
  }, [id])

  const handleGuestSubmit = (name) => {
    sessionStorage.setItem('retro_username', name)
    setUsername(name)
    setShowGuestModal(false)
  }

  const handleAddCard = (columnId) => {
    const text = newCardText[columnId]?.trim()
    if (!text || !socketRef.current) return
    socketRef.current.emit('add_card', { boardId: id, columnId, content: text, authorName: username })
    setNewCardText(prev => ({ ...prev, [columnId]: '' }))
  }

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !socketRef.current) return
    const { draggableId, destination } = result
    socketRef.current.emit('move_card', {
      boardId: id,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    })
  }, [id])

  const handleAddComment = (cardId, content) => {
    if (!socketRef.current) return
    socketRef.current.emit('add_comment', { boardId: id, cardId, content, authorName: username })
  }

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank')
  }

  const handleColumnAdded = (col) => {
    setBoard(prev => prev ? { ...prev, columns: [...prev.columns, col] } : prev)
  }

  if (showGuestModal) {
    return <GuestModal onSubmit={handleGuestSubmit} />
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    )
  }

  if (!board) {
    return (
      <div style={styles.loadingContainer}>
        <p style={{ color: '#9499ad' }}>Board not found.</p>
        <Link to="/" style={styles.backLink}>&#8592; Back to boards</Link>
      </div>
    )
  }

  const columnColors = ['#34d399', '#f87171', '#6c63ff', '#fbbf24', '#38bdf8', '#e879f9']

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/" style={styles.backBtn}>&#8592;</Link>
          <div>
            <h1 style={styles.boardTitle}>{board.title}</h1>
            <span style={styles.headerMeta}>
              Logged in as <strong style={{ color: '#6c63ff' }}>{username}</strong>
            </span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <AddColumnForm boardId={id} onColumnAdded={handleColumnAdded} />
          <button onClick={handleExport} style={styles.exportBtn}>
            &#8681; Export CSV
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={styles.columnsContainer}>
          {board.columns.map((col, colIdx) => {
            const accentColor = columnColors[colIdx % columnColors.length]
            return (
              <div key={col.id} style={styles.column}>
                <div style={{ ...styles.columnHeader, borderBottom: `2px solid ${accentColor}` }}>
                  <span style={{ ...styles.columnDot, background: accentColor }} />
                  <h2 style={styles.columnTitle}>{col.title}</h2>
                  <span style={styles.columnCount}>{col.cards.length}</span>
                </div>

                <div style={styles.addCardArea}>
                  <textarea
                    value={newCardText[col.id] || ''}
                    onChange={e => setNewCardText(prev => ({ ...prev, [col.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddCard(col.id) } }}
                    placeholder="Add a card..."
                    rows={2}
                    style={styles.cardInput}
                  />
                  <button onClick={() => handleAddCard(col.id)} style={{ ...styles.addCardBtn, background: accentColor }}>
                    + Add
                  </button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        ...styles.cardList,
                        background: snapshot.isDraggingOver ? 'rgba(108,99,255,0.05)' : 'transparent',
                      }}
                    >
                      {col.cards.map((card, cardIdx) => (
                        <Draggable key={card.id} draggableId={card.id} index={cardIdx}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                ...(snapshot.isDragging ? styles.cardDragging : {}),
                              }}
                            >
                              <CardItem
                                card={card}
                                accentColor={accentColor}
                                onClick={() => setSelectedCard(card)}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>

      {selectedCard && (
        <CommentPanel
          card={selectedCard}
          board={board}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(170deg, #0f1117 0%, #131620 50%, #0f1117 100%)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #2e3346',
    borderTop: '3px solid #6c63ff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  backLink: {
    color: '#6c63ff',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid #2e3346',
    background: 'rgba(15,17,23,0.9)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    flexWrap: 'wrap',
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    color: '#9499ad',
    fontSize: '20px',
    textDecoration: 'none',
    padding: '4px 8px',
    borderRadius: '8px',
    transition: 'background 200ms',
  },
  boardTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#e8eaf0',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  headerMeta: {
    fontSize: '13px',
    color: '#6b7089',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  exportBtn: {
    background: 'linear-gradient(135deg, #222632 0%, #2a2f3e 100%)',
    border: '1px solid #2e3346',
    color: '#e8eaf0',
    padding: '8px 18px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 200ms, box-shadow 200ms',
  },
  columnsContainer: {
    display: 'flex',
    gap: '16px',
    padding: '24px',
    flex: 1,
    overflowX: 'auto',
    alignItems: 'flex-start',
  },
  column: {
    minWidth: '300px',
    maxWidth: '340px',
    flex: '1 0 300px',
    background: 'linear-gradient(180deg, #1a1d27 0%, #181b24 100%)',
    border: '1px solid #2e3346',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  columnHeader: {
    padding: '16px 20px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  columnDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  columnTitle: {
    flex: 1,
    fontSize: '15px',
    fontWeight: 600,
    color: '#e8eaf0',
    margin: 0,
  },
  columnCount: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7089',
    background: '#222632',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  addCardArea: {
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardInput: {
    background: '#0f1117',
    border: '1px solid #2e3346',
    borderRadius: '8px',
    color: '#e8eaf0',
    padding: '10px 12px',
    fontSize: '13px',
    resize: 'none',
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.5,
    transition: 'border-color 200ms',
  },
  addCardBtn: {
    alignSelf: 'flex-end',
    color: '#fff',
    padding: '6px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 150ms',
  },
  cardList: {
    padding: '4px 12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: '60px',
    borderRadius: '8px',
    transition: 'background 200ms',
  },
  cardDragging: {
    opacity: 0.92,
    boxShadow: '0 8px 32px rgba(108,99,255,0.2)',
  },
}
