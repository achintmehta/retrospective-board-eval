import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import GuestAuthModal from '../components/GuestAuthModal'
import CommentPanel from '../components/CommentPanel'

const API = import.meta.env.VITE_API_URL || ''
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin
const NAME_KEY = 'retro_display_name'

export default function BoardPage() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [authorName, setAuthorName] = useState(() => sessionStorage.getItem(NAME_KEY) || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeCard, setActiveCard] = useState(null)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [addingCardCol, setAddingCardCol] = useState(null)
  const [newCardText, setNewCardText] = useState('')
  const socketRef = useRef(null)

  // Load board data
  useEffect(() => {
    fetch(`${API}/api/boards/${boardId}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((data) => {
        setBoard(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Board not found')
        setLoading(false)
      })
  }, [boardId])

  // Setup socket only after user has a display name
  useEffect(() => {
    if (!authorName) return

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.emit('join_board', { boardId })

    socket.on('card_added', ({ columnId, card }) => {
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

    socket.on('card_moved', ({ cardId, targetColumnId, position }) => {
      setBoard((prev) => {
        if (!prev) return prev
        let movedCard = null
        const stripped = prev.columns.map((col) => {
          const cards = col.cards.filter((c) => {
            if (c.id === cardId) { movedCard = c; return false }
            return true
          })
          return { ...col, cards }
        })
        if (!movedCard) return prev
        movedCard = { ...movedCard, column_id: targetColumnId, position }
        return {
          ...prev,
          columns: stripped.map((col) => {
            if (col.id !== targetColumnId) return col
            const cards = [...col.cards]
            cards.splice(position, 0, movedCard)
            return { ...col, cards }
          }),
        }
      })
    })

    socket.on('comment_added', ({ cardId, comment }) => {
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
      setActiveCard((ac) => ac?.id === cardId ? { ...ac, comments: [...(ac.comments || []), comment] } : ac)
    })

    return () => {
      socket.disconnect()
    }
  }, [authorName, boardId])

  function handleJoin(name) {
    sessionStorage.setItem(NAME_KEY, name)
    setAuthorName(name)
  }

  function handleAddCard(columnId) {
    if (!newCardText.trim()) return
    socketRef.current?.emit('add_card', {
      boardId,
      columnId,
      content: newCardText.trim(),
      authorName,
    })
    setNewCardText('')
    setAddingCardCol(null)
  }

  function handleAddComment(cardId, content) {
    socketRef.current?.emit('add_comment', { boardId, cardId, content, authorName })
  }

  function handleDragEnd(result) {
    const { draggableId, source, destination } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    // Optimistic UI update
    setBoard((prev) => {
      if (!prev) return prev
      let movedCard = null
      const stripped = prev.columns.map((col) => {
        const cards = [...col.cards]
        if (col.id === source.droppableId) {
          [movedCard] = cards.splice(source.index, 1)
        }
        return { ...col, cards }
      })
      if (!movedCard) return prev
      movedCard = { ...movedCard, column_id: destination.droppableId, position: destination.index }
      return {
        ...prev,
        columns: stripped.map((col) => {
          if (col.id !== destination.droppableId) return col
          const cards = [...col.cards]
          cards.splice(destination.index, 0, movedCard)
          return { ...col, cards }
        }),
      }
    })

    socketRef.current?.emit('move_card', {
      boardId,
      cardId: draggableId,
      targetColumnId: destination.droppableId,
      position: destination.index,
    })
  }

  async function handleAddColumn(e) {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    const res = await fetch(`${API}/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() }),
    })
    const col = await res.json()
    setBoard((prev) => prev ? { ...prev, columns: [...prev.columns, col] } : prev)
    setNewColumnTitle('')
  }

  function handleExport() {
    window.location.href = `${API}/api/boards/${boardId}/export`
  }

  if (loading) return <div className="loading">Loading board…</div>
  if (error) return (
    <div className="error-page">
      <p>{error}</p>
      <button onClick={() => navigate('/')}>Go Home</button>
    </div>
  )
  if (!authorName) return <GuestAuthModal onJoin={handleJoin} />

  return (
    <div className="board-page">
      <header className="board-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Home</button>
        <h1>{board.title}</h1>
        <div className="header-actions">
          <span className="user-badge">{authorName}</span>
          <button className="export-btn" onClick={handleExport}>Export CSV</button>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {board.columns.map((col) => (
            <div key={col.id} className="column">
              <div className="column-header">
                <h2>{col.title}</h2>
                <span className="card-count">{col.cards.length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    className={`cards-list${snapshot.isDraggingOver ? ' drag-over' : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {col.cards.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            className={`card${snapshot.isDragging ? ' dragging' : ''}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setActiveCard(card)}
                          >
                            <p className="card-content">{card.content}</p>
                            <div className="card-meta">
                              <span className="card-author">{card.author_name}</span>
                              <button
                                className="comment-btn"
                                onClick={(e) => { e.stopPropagation(); setActiveCard(card) }}
                              >
                                {card.comments?.length || 0} comment{card.comments?.length !== 1 ? 's' : ''}
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

              <div className="add-card-area">
                {addingCardCol === col.id ? (
                  <form className="add-card-form" onSubmit={(e) => { e.preventDefault(); handleAddCard(col.id) }}>
                    <textarea
                      placeholder="Card content…"
                      value={newCardText}
                      onChange={(e) => setNewCardText(e.target.value)}
                      autoFocus
                      rows={3}
                    />
                    <div className="form-actions">
                      <button type="submit" disabled={!newCardText.trim()}>Add Card</button>
                      <button type="button" onClick={() => { setAddingCardCol(null); setNewCardText('') }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button className="add-card-btn" onClick={() => setAddingCardCol(col.id)}>
                    + Add Card
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="add-column">
            <form onSubmit={handleAddColumn}>
              <input
                type="text"
                placeholder="Add column…"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                maxLength={50}
              />
              <button type="submit" disabled={!newColumnTitle.trim()}>+</button>
            </form>
          </div>
        </div>
      </DragDropContext>

      {activeCard && (
        <CommentPanel
          card={activeCard}
          authorName={authorName}
          onAddComment={handleAddComment}
          onClose={() => setActiveCard(null)}
        />
      )}
    </div>
  )
}
