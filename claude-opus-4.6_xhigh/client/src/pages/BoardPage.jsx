import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import GuestAuthModal from '../components/GuestAuthModal'
import CardItem from '../components/CardItem'
import AddCardForm from '../components/AddCardForm'
import AddColumnForm from '../components/AddColumnForm'
import './BoardPage.css'

export default function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [error, setError] = useState(null)
  const [socket, setSocket] = useState(null)
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('displayName') || '')

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Board not found')
        return res.json()
      })
      .then(setBoard)
      .catch(err => setError(err.message))
  }, [id])

  useEffect(() => {
    if (!displayName) return

    const s = io({ transports: ['websocket', 'polling'] })
    s.emit('join_board', id)

    s.on('card_added', (card) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col =>
          col.id === card.column_id
            ? { ...col, cards: [...col.cards, card] }
            : col
        )
        return { ...prev, columns }
      })
    })

    s.on('card_moved', ({ id: cardId, column_id, position }) => {
      setBoard(prev => {
        if (!prev) return prev
        let movedCard = null
        const withoutCard = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => {
            if (c.id === cardId) {
              movedCard = { ...c, column_id, position }
              return false
            }
            return true
          })
        }))
        if (!movedCard) return prev
        const columns = withoutCard.map(col =>
          col.id === column_id
            ? { ...col, cards: [...col.cards, movedCard].sort((a, b) => a.position - b.position) }
            : col
        )
        return { ...prev, columns }
      })
    })

    s.on('comment_added', (comment) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card =>
            card.id === comment.card_id
              ? { ...card, comments: [...card.comments, comment] }
              : card
          )
        }))
        return { ...prev, columns }
      })
    })

    s.on('column_added', (column) => {
      setBoard(prev => {
        if (!prev) return prev
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] }
      })
    })

    setSocket(s)
    return () => s.disconnect()
  }, [id, displayName])

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !socket) return

    const { draggableId, destination } = result
    const cardId = Number(draggableId)
    const newColumnId = Number(destination.droppableId)
    const newPosition = destination.index

    socket.emit('move_card', {
      boardId: id,
      cardId,
      newColumnId,
      newPosition,
    })
  }, [socket, id])

  function handleAddCard(columnId, content) {
    if (!socket) return
    socket.emit('add_card', {
      boardId: id,
      columnId,
      content,
      authorName: displayName,
    })
  }

  function handleAddComment(cardId, content) {
    if (!socket) return
    socket.emit('add_comment', {
      boardId: id,
      cardId,
      content,
      authorName: displayName,
    })
  }

  function handleAddColumn(title) {
    fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  }

  function handleGuestSubmit(name) {
    sessionStorage.setItem('displayName', name)
    setDisplayName(name)
  }

  if (!displayName) {
    return <GuestAuthModal onSubmit={handleGuestSubmit} />
  }

  if (error) {
    return (
      <div className="board-page">
        <header className="app-header">
          <div className="header-left">
            <Link to="/">Retro Board</Link>
          </div>
        </header>
        <div className="loading">{error}</div>
      </div>
    )
  }

  if (!board) {
    return <div className="loading">Loading board...</div>
  }

  return (
    <div className="board-page">
      <header className="app-header">
        <div className="header-left">
          <Link to="/">Retro Board</Link>
          <span className="board-title">{board.title}</span>
        </div>
        <div className="header-right">
          <span className="user-badge">{displayName}</span>
          <a
            href={`/api/boards/${id}/export`}
            className="export-btn"
            download
          >
            Export CSV
          </a>
        </div>
      </header>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns-container">
          {(board.columns || []).map(column => (
            <div key={column.id} className="column">
              <h3 className="column-title">{column.title}</h3>
              <Droppable droppableId={String(column.id)}>
                {(provided) => (
                  <div
                    className="cards-list"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {column.cards.map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={String(card.id)}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <CardItem
                              card={card}
                              onAddComment={handleAddComment}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <AddCardForm onAdd={(content) => handleAddCard(column.id, content)} />
            </div>
          ))}
          <AddColumnForm onAdd={handleAddColumn} />
        </div>
      </DragDropContext>
    </div>
  )
}
