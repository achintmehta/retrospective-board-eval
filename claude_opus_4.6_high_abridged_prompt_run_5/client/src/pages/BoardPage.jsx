import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import GuestModal from '../components/GuestModal'
import CommentPanel from '../components/CommentPanel'
import './BoardPage.css'

const COLUMN_COLORS = [
  { bg: 'var(--green-bg)', accent: 'var(--green)' },
  { bg: 'var(--rose-bg)', accent: 'var(--rose)' },
  { bg: 'var(--blue-bg)', accent: 'var(--blue)' },
  { bg: 'var(--amber-bg)', accent: 'var(--amber)' },
]

function SortableCard({ card, columnColor, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `card-${card.id}` })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card"
      {...attributes}
      {...listeners}
    >
      <p className="card-content">{card.content}</p>
      <div className="card-footer">
        <span className="card-author" style={{ color: columnColor }}>
          {card.author_name}
        </span>
        <button
          className="card-comment-btn"
          onClick={(e) => {
            e.stopPropagation()
            onClick(card)
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 3h12v8H5l-3 3V3z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          {card.comments?.length || 0}
        </button>
      </div>
    </div>
  )
}

function DroppableColumn({ columnId, children }) {
  const { setNodeRef } = useDroppable({ id: `column-${columnId}` })
  return (
    <div ref={setNodeRef} className="cards-list">
      {children}
    </div>
  )
}

function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [columns, setColumns] = useState([])
  const [guestName, setGuestName] = useState(() => sessionStorage.getItem('guestName') || '')
  const [showGuestModal, setShowGuestModal] = useState(!guestName)
  const [newCardText, setNewCardText] = useState({})
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const socketRef = useRef(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setBoard(data)
        setColumns(data.columns || [])
      })
  }, [id])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.emit('join_board', id)

    socket.on('column_added', (col) => {
      setColumns((prev) => [...prev, { ...col, cards: [] }])
    })

    socket.on('card_added', (card) => {
      setColumns((prev) =>
        prev.map((col) =>
          col.id === card.column_id
            ? { ...col, cards: [...col.cards, card] }
            : col
        )
      )
    })

    socket.on('card_moved', ({ id: cardId, column_id, position }) => {
      setColumns((prev) => {
        let movedCard = null
        const without = prev.map((col) => {
          const idx = col.cards.findIndex((c) => c.id === cardId)
          if (idx !== -1) {
            movedCard = { ...col.cards[idx], column_id, position }
            return { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
          }
          return col
        })
        if (!movedCard) return prev
        return without.map((col) =>
          col.id === column_id
            ? { ...col, cards: [...col.cards, movedCard].sort((a, b) => a.position - b.position) }
            : col
        )
      })
    })

    socket.on('comment_added', (comment) => {
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card.id === comment.card_id
              ? { ...card, comments: [...(card.comments || []), comment] }
              : card
          ),
        }))
      )
      setSelectedCard((prev) =>
        prev && prev.id === comment.card_id
          ? { ...prev, comments: [...(prev.comments || []), comment] }
          : prev
      )
    })

    socket.on('disconnect', () => {
      socket.once('connect', () => {
        socket.emit('join_board', id)
        fetchBoard()
      })
    })

    return () => socket.disconnect()
  }, [id, fetchBoard])

  const handleGuestSubmit = (name) => {
    setGuestName(name)
    sessionStorage.setItem('guestName', name)
    setShowGuestModal(false)
  }

  const handleAddCard = (columnId) => {
    const text = newCardText[columnId]?.trim()
    if (!text || !socketRef.current) return
    socketRef.current.emit('add_card', {
      columnId,
      content: text,
      authorName: guestName,
      boardId: Number(id),
    })
    setNewCardText((prev) => ({ ...prev, [columnId]: '' }))
  }

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) return
    await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() }),
    })
    setNewColumnTitle('')
    setAddingColumn(false)
  }

  const handleAddComment = (cardId, content) => {
    if (!socketRef.current) return
    socketRef.current.emit('add_comment', {
      cardId,
      content,
      authorName: guestName,
      boardId: Number(id),
    })
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const findColumnForCard = (cardId) => {
    for (const col of columns) {
      if (col.cards.some((c) => c.id === cardId)) return col.id
    }
    return null
  }

  const resolveTargetColumn = (overId) => {
    const overStr = String(overId)
    if (overStr.startsWith('column-')) {
      return Number(overStr.replace('column-', ''))
    }
    if (overStr.startsWith('card-')) {
      return findColumnForCard(Number(overStr.replace('card-', '')))
    }
    return null
  }

  const handleDragEnd = (event) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || !socketRef.current) return

    const cardId = Number(String(active.id).replace('card-', ''))
    const targetColumnId = resolveTargetColumn(over.id)
    if (!targetColumnId) return

    const currentColumnId = findColumnForCard(cardId)
    if (currentColumnId === targetColumnId) return

    const targetCol = columns.find((c) => c.id === targetColumnId)
    const newPosition = targetCol ? targetCol.cards.length : 0

    setColumns((prev) => {
      let movedCard = null
      const without = prev.map((col) => {
        const idx = col.cards.findIndex((c) => c.id === cardId)
        if (idx !== -1) {
          movedCard = { ...col.cards[idx], column_id: targetColumnId, position: newPosition }
          return { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
        }
        return col
      })
      if (!movedCard) return prev
      return without.map((col) =>
        col.id === targetColumnId
          ? { ...col, cards: [...col.cards, movedCard] }
          : col
      )
    })

    socketRef.current.emit('move_card', {
      cardId,
      newColumnId: targetColumnId,
      newPosition,
      boardId: Number(id),
    })
  }

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank')
  }

  const getActiveCard = () => {
    if (!activeId) return null
    const cardId = Number(String(activeId).replace('card-', ''))
    for (const col of columns) {
      const card = col.cards.find((c) => c.id === cardId)
      if (card) return card
    }
    return null
  }

  if (showGuestModal) {
    return <GuestModal onSubmit={handleGuestSubmit} />
  }

  if (!board) {
    return (
      <div className="board-loading">
        <div className="spinner" />
        <span>Loading board...</span>
      </div>
    )
  }

  const draggedCard = getActiveCard()

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-left">
          <Link to="/" className="back-link">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="board-title">{board.title}</h1>
        </div>
        <div className="board-header-right">
          <span className="guest-badge">{guestName}</span>
          <button className="btn-secondary" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 11v3h12v-3M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export CSV
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="columns-container">
          {columns.map((col, idx) => {
            const color = COLUMN_COLORS[idx % COLUMN_COLORS.length]
            return (
              <div key={col.id} className="column">
                <div className="column-header">
                  <div
                    className="column-dot"
                    style={{ background: color.accent }}
                  />
                  <h2 className="column-title">{col.title}</h2>
                  <span className="column-count">{col.cards.length}</span>
                </div>

                <SortableContext
                  id={`sortable-${col.id}`}
                  items={col.cards.map((c) => `card-${c.id}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn columnId={col.id}>
                    {col.cards.map((card) => (
                      <SortableCard
                        key={card.id}
                        card={card}
                        columnColor={color.accent}
                        onClick={setSelectedCard}
                      />
                    ))}
                  </DroppableColumn>
                </SortableContext>

                <div className="add-card-area">
                  <textarea
                    value={newCardText[col.id] || ''}
                    onChange={(e) =>
                      setNewCardText((prev) => ({
                        ...prev,
                        [col.id]: e.target.value,
                      }))
                    }
                    placeholder="Add a card..."
                    className="add-card-input"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddCard(col.id)
                      }
                    }}
                  />
                  <button
                    className="add-card-btn"
                    onClick={() => handleAddCard(col.id)}
                    disabled={!newCardText[col.id]?.trim()}
                    style={{ color: color.accent }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}

          <div className="column add-column">
            {addingColumn ? (
              <div className="add-column-form">
                <input
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="Column title..."
                  className="add-column-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn()
                    if (e.key === 'Escape') setAddingColumn(false)
                  }}
                />
                <div className="add-column-actions">
                  <button className="btn-primary btn-sm" onClick={handleAddColumn}>
                    Add
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => setAddingColumn(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="add-column-btn"
                onClick={() => setAddingColumn(true)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Add Column
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {draggedCard ? (
            <div className="card card-overlay">
              <p className="card-content">{draggedCard.content}</p>
              <div className="card-footer">
                <span className="card-author">{draggedCard.author_name}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedCard && (
        <CommentPanel
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddComment={handleAddComment}
          guestName={guestName}
        />
      )}
    </div>
  )
}

export default BoardPage
