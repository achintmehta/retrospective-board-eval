import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import GuestModal from '../components/GuestModal.jsx'
import Column from '../components/Column.jsx'
import CardDetail from '../components/CardDetail.jsx'
import styles from './BoardPage.module.css'

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [guestName, setGuestName] = useState(() => sessionStorage.getItem('guestName') || '')
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const socketRef = useRef(null)

  const fetchBoard = useCallback(async () => {
    const res = await fetch(`/api/boards/${id}`)
    if (!res.ok) return navigate('/')
    const data = await res.json()
    setBoard(data)
    setLoading(false)
  }, [id, navigate])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    if (!guestName) {
      setShowGuestModal(true)
      return
    }
    setShowGuestModal(false)

    const socket = io({ transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.emit('join_board', id)

    socket.on('card_added', ({ columnId, card }) => {
      setBoard(prev => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
          ),
        }
      })
    })

    socket.on('card_moved', ({ cardId, targetColumnId, position }) => {
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
        movedCard = { ...movedCard, column_id: targetColumnId, position }
        return {
          ...prev,
          columns: withoutCard.map(col => {
            if (col.id === targetColumnId) {
              const cards = [...col.cards]
              cards.splice(position, 0, movedCard)
              return { ...col, cards }
            }
            return col
          }),
        }
      })
    })

    socket.on('comment_added', ({ cardId, comment }) => {
      setBoard(prev => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.cards.map(card =>
              card.id === cardId
                ? { ...card, comments: [...card.comments, comment] }
                : card
            ),
          })),
        }
      })
      setSelectedCard(prev => {
        if (prev && prev.id === cardId) {
          return { ...prev, comments: [...prev.comments, comment] }
        }
        return prev
      })
    })

    socket.on('column_added', ({ column }) => {
      setBoard(prev => {
        if (!prev) return prev
        return { ...prev, columns: [...prev.columns, column] }
      })
    })

    return () => socket.disconnect()
  }, [id, guestName])

  function handleGuestSubmit(name) {
    sessionStorage.setItem('guestName', name)
    setGuestName(name)
  }

  function handleAddCard(columnId, content) {
    socketRef.current?.emit('add_card', { columnId, content, authorName: guestName })
  }

  function handleAddComment(cardId, content) {
    socketRef.current?.emit('add_comment', { cardId, content, authorName: guestName })
  }

  async function handleAddColumn(e) {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    const res = await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() }),
    })
    if (res.ok) {
      const column = await res.json()
      setBoard(prev => prev ? { ...prev, columns: [...prev.columns, column] } : prev)
      setNewColumnTitle('')
    }
  }

  function handleDragEnd(result) {
    if (!result.destination) return
    const { draggableId, destination } = result
    const targetColumnId = destination.droppableId
    const position = destination.index

    setBoard(prev => {
      if (!prev) return prev
      let movedCard = null
      const withoutCard = prev.columns.map(col => ({
        ...col,
        cards: col.cards.filter(c => {
          if (c.id === draggableId) { movedCard = c; return false }
          return true
        }),
      }))
      if (!movedCard) return prev
      movedCard = { ...movedCard, column_id: targetColumnId, position }
      return {
        ...prev,
        columns: withoutCard.map(col => {
          if (col.id === targetColumnId) {
            const cards = [...col.cards]
            cards.splice(position, 0, movedCard)
            return { ...col, cards }
          }
          return col
        }),
      }
    })

    socketRef.current?.emit('move_card', { cardId: draggableId, targetColumnId, position })
  }

  function handleExport() {
    window.open(`/api/boards/${id}/export`, '_blank')
  }

  if (showGuestModal) {
    return <GuestModal onSubmit={handleGuestSubmit} />
  }

  if (loading) {
    return <div className={styles.loading}>Loading board...</div>
  }

  if (!board) {
    return <div className={styles.loading}>Board not found</div>
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          &#8592; Boards
        </button>
        <div className={styles.headerCenter}>
          <h1 className={styles.boardTitle}>{board.title}</h1>
          <span className={styles.guestBadge}>{guestName}</span>
        </div>
        <button className={styles.exportBtn} onClick={handleExport}>
          Export CSV
        </button>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.columnsContainer}>
          {board.columns.map(col => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onSelectCard={setSelectedCard}
            />
          ))}

          <form className={styles.addColumnForm} onSubmit={handleAddColumn}>
            <input
              className={styles.addColumnInput}
              type="text"
              placeholder="+ Add column..."
              value={newColumnTitle}
              onChange={e => setNewColumnTitle(e.target.value)}
              maxLength={50}
            />
          </form>
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
