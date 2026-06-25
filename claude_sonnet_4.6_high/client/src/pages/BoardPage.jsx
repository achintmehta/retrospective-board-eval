import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext } from '@hello-pangea/dnd'
import GuestAuthModal from '../components/GuestAuthModal'
import Column from '../components/Column'
import CommentModal from '../components/CommentModal'

let socket = null

export default function BoardPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authorName, setAuthorName] = useState(() => sessionStorage.getItem('displayName'))
  const [selectedCard, setSelectedCard] = useState(null)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [addingColumn, setAddingColumn] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/boards/${boardId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Board not found')
        return r.json()
      })
      .then((data) => {
        setBoard(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [boardId])

  useEffect(() => {
    if (!authorName) return

    socket = io({ path: '/socket.io' })
    socket.emit('join_board', boardId)

    socket.on('card_added', ({ card, columnId }) => {
      setBoard((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: [...col.cards, card] }
              : col
          ),
        }
      })
    })

    socket.on('card_moved', ({ card, newColumnId }) => {
      setBoard((prev) => {
        if (!prev) return prev
        const allCards = prev.columns.flatMap((c) =>
          c.cards.map((cd) => ({ ...cd, column_id: cd.column_id }))
        )
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            if (col.id === card.column_id) {
              const cards = col.cards.filter((c) => c.id !== card.id)
              cards.splice(card.position, 0, card)
              return { ...col, cards }
            }
            if (col.id !== card.column_id) {
              return { ...col, cards: col.cards.filter((c) => c.id !== card.id) }
            }
            return col
          }),
        }
      })
    })

    socket.on('column_added', ({ column }) => {
      setBoard((prev) => {
        if (!prev) return prev
        return { ...prev, columns: [...prev.columns, column] }
      })
    })

    socket.on('comment_added', ({ comment, cardId }) => {
      setBoard((prev) => {
        if (!prev) return prev
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
        }
      })
      setSelectedCard((prev) =>
        prev && prev.id === cardId
          ? { ...prev, comments: [...(prev.comments || []), comment] }
          : prev
      )
    })

    return () => {
      socket.emit('leave_board', boardId)
      socket.disconnect()
      socket = null
    }
  }, [boardId, authorName])

  function handleJoin(name) {
    sessionStorage.setItem('displayName', name)
    setAuthorName(name)
  }

  function handleAddCard(columnId, content) {
    socket.emit('add_card', { boardId, columnId, content, authorName })
  }

  function handleAddComment(cardId, content) {
    socket.emit('add_comment', { boardId, cardId, content, authorName })
  }

  function handleDragEnd(result) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    socket.emit('move_card', {
      boardId,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    })

    setBoard((prev) => {
      if (!prev) return prev
      const srcCol = prev.columns.find((c) => c.id === source.droppableId)
      const destCol = prev.columns.find((c) => c.id === destination.droppableId)
      const card = srcCol.cards[source.index]
      const newColumns = prev.columns.map((col) => {
        if (col.id === source.droppableId && col.id === destination.droppableId) {
          const cards = Array.from(col.cards)
          cards.splice(source.index, 1)
          cards.splice(destination.index, 0, card)
          return { ...col, cards }
        }
        if (col.id === source.droppableId) {
          const cards = Array.from(col.cards)
          cards.splice(source.index, 1)
          return { ...col, cards }
        }
        if (col.id === destination.droppableId) {
          const cards = Array.from(col.cards)
          cards.splice(destination.index, 0, card)
          return { ...col, cards }
        }
        return col
      })
      return { ...prev, columns: newColumns }
    })
  }

  function handleAddColumn(e) {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    socket.emit('add_column', { boardId, title: newColumnTitle.trim() })
    setNewColumnTitle('')
    setAddingColumn(false)
  }

  function handleExport() {
    window.location.href = `/api/boards/${boardId}/export`
  }

  if (loading) return <div className="loading">Loading board...</div>
  if (error) return (
    <div className="error-page">
      <p>{error}</p>
      <button onClick={() => navigate('/')}>Back to Boards</button>
    </div>
  )

  return (
    <div className="board-page">
      {!authorName && <GuestAuthModal onJoin={handleJoin} />}
      {selectedCard && (
        <CommentModal
          card={selectedCard}
          authorName={authorName}
          onAddComment={handleAddComment}
          onClose={() => setSelectedCard(null)}
        />
      )}
      <header className="board-header">
        <button className="back-btn" onClick={() => navigate('/')}>Back</button>
        <h1>{board.title}</h1>
        <button className="export-btn" onClick={handleExport}>Export CSV</button>
      </header>
      {authorName && (
        <div className="user-badge">Joined as: <strong>{authorName}</strong></div>
      )}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              authorName={authorName}
              onAddCard={handleAddCard}
              onOpenComments={setSelectedCard}
            />
          ))}
          <div className="add-column-section">
            {addingColumn ? (
              <form onSubmit={handleAddColumn} className="add-column-form">
                <input
                  type="text"
                  placeholder="Column title"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={!newColumnTitle.trim()}>Add</button>
                <button type="button" onClick={() => { setAddingColumn(false); setNewColumnTitle('') }}>Cancel</button>
              </form>
            ) : (
              <button className="add-column-btn" onClick={() => setAddingColumn(true)}>
                + Add Column
              </button>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  )
}
