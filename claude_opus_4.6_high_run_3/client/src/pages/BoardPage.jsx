import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import GuestModal from '../components/GuestModal'
import Column from '../components/Column'
import CardDetail from '../components/CardDetail'

const API = 'http://localhost:3001/api'

function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [displayName, setDisplayName] = useState(
    () => sessionStorage.getItem('retroDisplayName') || ''
  )
  const [socket, setSocket] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  useEffect(() => {
    fetch(`${API}/boards/${id}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then(setBoard)
      .catch(() => navigate('/'))
  }, [id, navigate])

  useEffect(() => {
    if (!displayName) return

    const s = io('http://localhost:3001')
    s.emit('join_board', id)
    setSocket(s)

    s.on('card_added', (card) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col => {
          if (col.id === card.column_id) {
            return { ...col, cards: [...col.cards, { ...card, comments: [] }] }
          }
          return col
        })
        return { ...prev, columns }
      })
    })

    s.on('card_moved', ({ cardId, targetColumnId, targetPosition }) => {
      setBoard(prev => {
        if (!prev) return prev
        let movedCard = null
        const withoutCard = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => {
            if (c.id === cardId) { movedCard = c; return false }
            return true
          })
        }))
        if (!movedCard) return prev
        const columns = withoutCard.map(col => {
          if (col.id === targetColumnId) {
            const cards = [...col.cards]
            movedCard = { ...movedCard, column_id: targetColumnId, position: targetPosition }
            cards.splice(targetPosition, 0, movedCard)
            return { ...col, cards }
          }
          return col
        })
        return { ...prev, columns }
      })
    })

    s.on('comment_added', (comment) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card => {
            if (card.id === comment.cardId) {
              return { ...card, comments: [...card.comments, comment] }
            }
            return card
          })
        }))
        return { ...prev, columns }
      })
      setSelectedCard(prev => {
        if (prev && prev.id === comment.cardId) {
          return { ...prev, comments: [...prev.comments, comment] }
        }
        return prev
      })
    })

    return () => {
      s.emit('leave_board', id)
      s.disconnect()
    }
  }, [displayName, id])

  const handleGuestSubmit = (name) => {
    sessionStorage.setItem('retroDisplayName', name)
    setDisplayName(name)
  }

  const handleAddCard = useCallback((columnId, content) => {
    if (socket) {
      socket.emit('add_card', {
        columnId,
        content,
        authorName: displayName,
        boardId: id
      })
    }
  }, [socket, displayName, id])

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !socket) return
    const cardId = Number(result.draggableId)
    const targetColumnId = Number(result.destination.droppableId)
    const targetPosition = result.destination.index

    socket.emit('move_card', {
      cardId,
      targetColumnId,
      targetPosition,
      boardId: id
    })
  }, [socket, id])

  const handleAddComment = useCallback((cardId, content) => {
    if (socket) {
      socket.emit('add_comment', {
        cardId,
        content,
        authorName: displayName,
        boardId: id
      })
    }
  }, [socket, displayName, id])

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    const res = await fetch(`${API}/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() })
    })
    const col = await res.json()
    setBoard(prev => ({
      ...prev,
      columns: [...prev.columns, { ...col, cards: [] }]
    }))
    setNewColumnTitle('')
  }

  const handleExport = () => {
    window.open(`${API}/boards/${id}/export`, '_blank')
  }

  if (!displayName) {
    return <GuestModal onSubmit={handleGuestSubmit} />
  }

  if (!board) {
    return <div style={styles.loading}>Loading board...</div>
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>Back</button>
          <h1 style={styles.title}>{board.title}</h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.userName}>{displayName}</span>
          <button onClick={handleExport} style={styles.exportBtn}>Export CSV</button>
        </div>
      </header>

      <form onSubmit={handleAddColumn} style={styles.addColumnForm}>
        <input
          type="text"
          placeholder="New column name..."
          value={newColumnTitle}
          onChange={e => setNewColumnTitle(e.target.value)}
          style={styles.addColumnInput}
        />
        <button type="submit" style={styles.addColumnBtn}>Add Column</button>
      </form>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={styles.columnsContainer}>
          {board.columns.map(col => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onCardClick={setSelectedCard}
            />
          ))}
          {board.columns.length === 0 && (
            <p style={styles.muted}>Add columns to get started</p>
          )}
        </div>
      </DragDropContext>

      {selectedCard && (
        <CardDetail
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  )
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: 'var(--text-muted)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 14,
    color: 'var(--text)',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
  },
  userName: {
    color: 'var(--text-muted)',
    fontSize: 14,
  },
  exportBtn: {
    padding: '8px 16px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
  },
  addColumnForm: {
    display: 'flex',
    gap: 8,
    padding: '12px 24px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
  },
  addColumnInput: {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    fontSize: 14,
    width: 200,
    outline: 'none',
  },
  addColumnBtn: {
    padding: '8px 16px',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
  },
  columnsContainer: {
    display: 'flex',
    gap: 16,
    padding: 24,
    flex: 1,
    overflowX: 'auto',
    alignItems: 'flex-start',
  },
  muted: {
    color: 'var(--text-muted)',
    padding: 40,
    textAlign: 'center',
    width: '100%',
  },
}

export default BoardPage
