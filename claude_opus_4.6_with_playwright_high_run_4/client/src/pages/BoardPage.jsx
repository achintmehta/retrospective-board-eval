import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import GuestAuthModal from '../components/GuestAuthModal'
import Column from '../components/Column'
import CardModal from '../components/CardModal'

const styles = {
  container: { padding: 16, height: '100vh', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backLink: { fontSize: 14 },
  title: { fontSize: 24, margin: 0 },
  headerRight: { display: 'flex', gap: 8, alignItems: 'center' },
  addColForm: { display: 'flex', gap: 8 },
  addColInput: { width: 160 },
  columnsContainer: { display: 'flex', gap: 16, flex: 1, overflowX: 'auto', paddingBottom: 16 },
  user: { fontSize: 13, color: '#666' },
}

export default function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('retroDisplayName') || '')
  const [showAuth, setShowAuth] = useState(!displayName)
  const [newColTitle, setNewColTitle] = useState('')
  const [selectedCardId, setSelectedCardId] = useState(null)
  const socketRef = useRef(null)

  const selectedCard = selectedCardId && board
    ? board.columns.flatMap(c => c.cards || []).find(c => c.id === selectedCardId) || null
    : null

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then((r) => r.json())
      .then(setBoard)
  }, [id])

  useEffect(() => {
    if (!displayName || !board) return

    const socket = io({ transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.emit('join_board', Number(id))

    socket.on('card_added', (card) => {
      setBoard((prev) => {
        if (!prev) return prev
        const columns = prev.columns.map((col) => {
          if (col.id === card.column_id) {
            return { ...col, cards: [...col.cards, card] }
          }
          return col
        })
        return { ...prev, columns }
      })
    })

    socket.on('card_moved', ({ card_id, target_column_id, position }) => {
      setBoard((prev) => {
        if (!prev) return prev
        let movedCard = null
        const withoutCard = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => {
            if (c.id === card_id) { movedCard = c; return false }
            return true
          }),
        }))
        if (!movedCard) return prev
        movedCard = { ...movedCard, column_id: target_column_id, position }
        const columns = withoutCard.map((col) => {
          if (col.id === target_column_id) {
            const cards = [...col.cards]
            cards.splice(position, 0, movedCard)
            return { ...col, cards }
          }
          return col
        })
        return { ...prev, columns }
      })
    })

    socket.on('comment_added', (comment) => {
      setBoard((prev) => {
        if (!prev) return prev
        const columns = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) => {
            if (card.id === comment.card_id) {
              return { ...card, comments: [...(card.comments || []), comment] }
            }
            return card
          }),
        }))
        return { ...prev, columns }
      })
    })

    return () => socket.disconnect()
  }, [displayName, board?.id])

  const handleAuth = (name) => {
    sessionStorage.setItem('retroDisplayName', name)
    setDisplayName(name)
    setShowAuth(false)
  }

  const addColumn = async (e) => {
    e.preventDefault()
    if (!newColTitle.trim()) return
    const res = await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColTitle.trim() }),
    })
    const col = await res.json()
    setBoard((prev) => ({ ...prev, columns: [...prev.columns, col] }))
    setNewColTitle('')
  }

  const addCard = (columnId, content) => {
    if (!socketRef.current) return
    socketRef.current.emit('add_card', { column_id: columnId, content, author_name: displayName })
  }

  const addComment = (cardId, content) => {
    if (!socketRef.current) return
    socketRef.current.emit('add_comment', { card_id: cardId, content, author_name: displayName })
  }

  const onDragEnd = (result) => {
    if (!result.destination || !socketRef.current) return
    const { draggableId, destination } = result
    const cardId = Number(draggableId)
    const targetColumnId = Number(destination.droppableId)
    const position = destination.index

    socketRef.current.emit('move_card', { card_id: cardId, target_column_id: targetColumnId, position })

    setBoard((prev) => {
      if (!prev) return prev
      let movedCard = null
      const withoutCard = prev.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => {
          if (c.id === cardId) { movedCard = c; return false }
          return true
        }),
      }))
      if (!movedCard) return prev
      movedCard = { ...movedCard, column_id: targetColumnId, position }
      const columns = withoutCard.map((col) => {
        if (col.id === targetColumnId) {
          const cards = [...col.cards]
          cards.splice(position, 0, movedCard)
          return { ...col, cards }
        }
        return col
      })
      return { ...prev, columns }
    })
  }

  const exportCsv = () => {
    window.open(`/api/boards/${id}/export`, '_blank')
  }

  if (showAuth) return <GuestAuthModal onSubmit={handleAuth} />
  if (!board) return <div style={{ padding: 32 }}>Loading...</div>

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/" style={styles.backLink}>&larr; All Boards</Link>
          <h1 style={styles.title}>{board.title}</h1>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.user}>Signed in as: {displayName}</span>
          <form onSubmit={addColumn} style={styles.addColForm}>
            <input
              style={styles.addColInput}
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              placeholder="New column..."
            />
            <button type="submit">Add Column</button>
          </form>
          <button onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={styles.columnsContainer}>
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={addCard}
              onSelectCard={(card) => setSelectedCardId(card.id)}
            />
          ))}
          {board.columns.length === 0 && (
            <div style={{ padding: 32, color: '#888' }}>
              Add columns to get started (e.g., "Went Well", "Needs Improvement", "Action Items")
            </div>
          )}
        </div>
      </DragDropContext>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCardId(null)}
          onAddComment={addComment}
        />
      )}
    </div>
  )
}
