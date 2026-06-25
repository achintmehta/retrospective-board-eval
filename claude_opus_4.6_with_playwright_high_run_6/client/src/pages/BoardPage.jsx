import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import GuestModal from '../components/GuestModal'
import Column from '../components/Column'
import CardDetailModal from '../components/CardDetailModal'

export default function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [socket, setSocket] = useState(null)
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('displayName') || '')
  const [showGuestModal, setShowGuestModal] = useState(!sessionStorage.getItem('displayName'))
  const [selectedCard, setSelectedCard] = useState(null)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(res => res.json())
      .then(setBoard)
  }, [id])

  useEffect(() => {
    if (!displayName) return

    const s = io({ transports: ['websocket', 'polling'] })
    s.on('connect', () => {
      s.emit('join_board', id)
    })

    s.on('card_added', ({ columnId, card }) => {
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

    s.on('card_moved', ({ cardId, targetColumnId, targetPosition }) => {
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

        return {
          ...prev,
          columns: withoutCard.map(col => {
            if (col.id === targetColumnId) {
              const cards = [...col.cards]
              cards.splice(targetPosition, 0, { ...movedCard, column_id: targetColumnId })
              return { ...col, cards }
            }
            return col
          }),
        }
      })
    })

    s.on('comment_added', ({ cardId, comment }) => {
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

    s.on('column_added', ({ column }) => {
      setBoard(prev => {
        if (!prev) return prev
        return { ...prev, columns: [...prev.columns, column] }
      })
    })

    setSocket(s)
    return () => {
      s.emit('leave_board', id)
      s.disconnect()
    }
  }, [id, displayName])

  const handleGuestSubmit = (name) => {
    sessionStorage.setItem('displayName', name)
    setDisplayName(name)
    setShowGuestModal(false)
  }

  const handleAddCard = useCallback((columnId, content) => {
    if (socket) {
      socket.emit('add_card', { boardId: id, columnId, content, authorName: displayName })
    }
  }, [socket, id, displayName])

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !socket) return

    const { draggableId, destination } = result
    socket.emit('move_card', {
      boardId: id,
      cardId: draggableId,
      targetColumnId: destination.droppableId,
      targetPosition: destination.index,
    })
  }, [socket, id])

  const handleAddComment = useCallback((cardId, content) => {
    if (socket) {
      socket.emit('add_comment', { boardId: id, cardId, content, authorName: displayName })
    }
  }, [socket, id, displayName])

  const handleAddColumn = (e) => {
    e.preventDefault()
    if (!newColumnTitle.trim() || !socket) return
    socket.emit('add_column', { boardId: id, title: newColumnTitle.trim() })
    setNewColumnTitle('')
  }

  const handleExport = () => {
    window.location.href = `/api/boards/${id}/export`
  }

  if (showGuestModal) {
    return <GuestModal onSubmit={handleGuestSubmit} />
  }

  if (!board) {
    return <div className="loading">Loading board...</div>
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <h1>{board.title}</h1>
        <div className="board-actions">
          <form onSubmit={handleAddColumn} className="add-column-form">
            <input
              type="text"
              value={newColumnTitle}
              onChange={e => setNewColumnTitle(e.target.value)}
              placeholder="New column..."
            />
            <button type="submit">Add Column</button>
          </form>
          <button onClick={handleExport} className="export-btn">Export CSV</button>
        </div>
      </header>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns.map(column => (
            <Column
              key={column.id}
              column={column}
              onAddCard={handleAddCard}
              onCardClick={setSelectedCard}
            />
          ))}
        </div>
      </DragDropContext>
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  )
}
