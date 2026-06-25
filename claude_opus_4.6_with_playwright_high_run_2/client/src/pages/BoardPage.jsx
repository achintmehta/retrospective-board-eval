import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext } from '@hello-pangea/dnd'
import GuestAuthModal from '../components/GuestAuthModal'
import Column from '../components/Column'
import CommentsModal from '../components/CommentsModal'

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
  },
  backLink: {
    color: '#646cff',
    fontSize: 14,
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: 'inherit',
  },
  boardTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1a1a2e',
  },
  actions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  addColumnBtn: {
    padding: '6px 14px',
    background: '#646cff',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  exportBtn: {
    padding: '6px 14px',
    background: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  userName: {
    fontSize: 13,
    color: '#666',
  },
  board: {
    flex: 1,
    display: 'flex',
    gap: 16,
    padding: 20,
    overflowX: 'auto',
    alignItems: 'flex-start',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: '#666',
  },
  columnFormOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  columnForm: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    width: 360,
  },
  columnInput: {
    width: '100%',
    padding: '10px 14px',
    border: '2px solid #e0e0e0',
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 12,
    outline: 'none',
  },
  columnSubmitBtn: {
    width: '100%',
    padding: '10px',
    background: '#646cff',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 600,
  },
}

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [userName, setUserName] = useState(() => sessionStorage.getItem('retroUserName') || '')
  const [selectedCard, setSelectedCard] = useState(null)
  const [showColumnForm, setShowColumnForm] = useState(false)
  const [columnTitle, setColumnTitle] = useState('')
  const socketRef = useRef(null)

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Board not found')
        return res.json()
      })
      .then(setBoard)
  }, [id])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    if (!userName) return

    const socket = io({ transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_board', Number(id))
    })

    socket.on('card_added', (card) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col => {
          if (col.id === card.column_id) {
            return { ...col, cards: [...col.cards, card] }
          }
          return col
        })
        return { ...prev, columns }
      })
    })

    socket.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoard(prev => {
        if (!prev) return prev
        let movedCard = null
        const withoutCard = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => {
            if (c.id === cardId) {
              movedCard = c
              return false
            }
            return true
          }),
        }))
        if (!movedCard) return prev
        movedCard = { ...movedCard, column_id: newColumnId, position: newPosition }
        const columns = withoutCard.map(col => {
          if (col.id === newColumnId) {
            const cards = [...col.cards]
            cards.splice(newPosition, 0, movedCard)
            return { ...col, cards }
          }
          return col
        })
        return { ...prev, columns }
      })
    })

    socket.on('comment_added', (comment) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card => {
            if (card.id === comment.cardId) {
              return { ...card, comments: [...(card.comments || []), comment] }
            }
            return card
          }),
        }))
        return { ...prev, columns }
      })
      setSelectedCard(prev => {
        if (prev && prev.id === comment.cardId) {
          return { ...prev, comments: [...(prev.comments || []), comment] }
        }
        return prev
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [id, userName])

  function handleJoin(name) {
    sessionStorage.setItem('retroUserName', name)
    setUserName(name)
  }

  function handleAddCard(columnId, content) {
    if (!socketRef.current) return
    socketRef.current.emit('add_card', { columnId, content, authorName: userName })
  }

  function handleDragEnd(result) {
    if (!result.destination || !socketRef.current) return
    const { draggableId, destination } = result
    const cardId = Number(draggableId)
    const newColumnId = Number(destination.droppableId)
    const newPosition = destination.index

    socketRef.current.emit('move_card', { cardId, newColumnId, newPosition })
  }

  function handleAddComment(cardId, content) {
    if (!socketRef.current) return
    socketRef.current.emit('add_comment', { cardId, content, authorName: userName })
  }

  function handleOpenComments(card) {
    setSelectedCard(card)
  }

  async function handleAddColumn(e) {
    e.preventDefault()
    if (!columnTitle.trim()) return
    const res = await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: columnTitle.trim() }),
    })
    const col = await res.json()
    col.cards = []
    setBoard(prev => ({ ...prev, columns: [...prev.columns, col] }))
    setColumnTitle('')
    setShowColumnForm(false)
  }

  function handleExport() {
    window.location.href = `/api/boards/${id}/export`
  }

  if (!userName) {
    return <GuestAuthModal onJoin={handleJoin} />
  }

  if (!board) {
    return <div style={styles.loading}>Loading board...</div>
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.backLink} onClick={() => navigate('/')}>
          &larr; All Boards
        </button>
        <span style={styles.boardTitle}>{board.title}</span>
        <div style={styles.actions}>
          <span style={styles.userName}>{userName}</span>
          <button style={styles.addColumnBtn} onClick={() => setShowColumnForm(true)}>
            + Column
          </button>
          <button style={styles.exportBtn} onClick={handleExport}>
            Export CSV
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={styles.board}>
          {board.columns.map(col => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onOpenComments={handleOpenComments}
            />
          ))}
        </div>
      </DragDropContext>

      {showColumnForm && (
        <div style={styles.columnFormOverlay} onClick={() => setShowColumnForm(false)}>
          <form style={styles.columnForm} onClick={e => e.stopPropagation()} onSubmit={handleAddColumn}>
            <input
              style={styles.columnInput}
              type="text"
              placeholder="Column title..."
              value={columnTitle}
              onChange={e => setColumnTitle(e.target.value)}
              autoFocus
            />
            <button type="submit" style={styles.columnSubmitBtn}>Add Column</button>
          </form>
        </div>
      )}

      {selectedCard && (
        <CommentsModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  )
}
