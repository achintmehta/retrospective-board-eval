import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import CardItem from '../components/CardItem.jsx'
import AddCardForm from '../components/AddCardForm.jsx'

export default function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [socket, setSocket] = useState(null)
  const [displayName, setDisplayName] = useState(() =>
    sessionStorage.getItem('retroDisplayName') || ''
  )
  const [nameInput, setNameInput] = useState('')
  const [showAuth, setShowAuth] = useState(!displayName)
  const [newColumnTitle, setNewColumnTitle] = useState('')

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then(res => res.json())
      .then(setBoard)
  }, [id])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    if (!displayName) return

    const s = io({ transports: ['websocket', 'polling'] })
    s.on('connect', () => {
      s.emit('join_board', id)
    })

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
        const columnsWithout = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => {
            if (c.id === cardId) {
              movedCard = c
              return false
            }
            return true
          })
        }))
        if (!movedCard) return prev
        movedCard = { ...movedCard, column_id: targetColumnId, position: targetPosition }
        const columns = columnsWithout.map(col => {
          if (col.id === targetColumnId) {
            const cards = [...col.cards]
            cards.splice(targetPosition, 0, movedCard)
            return { ...col, cards }
          }
          return col
        })
        return { ...prev, columns }
      })
    })

    s.on('comment_added', ({ cardId, comment }) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card => {
            if (card.id === cardId) {
              return { ...card, comments: [...(card.comments || []), comment] }
            }
            return card
          })
        }))
        return { ...prev, columns }
      })
    })

    setSocket(s)
    return () => s.disconnect()
  }, [id, displayName])

  const handleJoin = (e) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    const name = nameInput.trim()
    sessionStorage.setItem('retroDisplayName', name)
    setDisplayName(name)
    setShowAuth(false)
  }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    const res = await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() })
    })
    const column = await res.json()
    setBoard(prev => ({
      ...prev,
      columns: [...prev.columns, { ...column, cards: [] }]
    }))
    setNewColumnTitle('')
  }

  const handleAddCard = (columnId, content) => {
    if (!socket) return
    socket.emit('add_card', {
      boardId: parseInt(id),
      columnId,
      content,
      authorName: displayName
    })
  }

  const handleAddComment = (cardId, content) => {
    if (!socket) return
    socket.emit('add_comment', {
      boardId: parseInt(id),
      cardId,
      content,
      authorName: displayName
    })
  }

  const handleDragEnd = (result) => {
    if (!result.destination || !socket) return
    const { draggableId, destination } = result
    const cardId = parseInt(draggableId)
    const targetColumnId = parseInt(destination.droppableId)
    const targetPosition = destination.index

    socket.emit('move_card', {
      boardId: parseInt(id),
      cardId,
      targetColumnId,
      targetPosition
    })
  }

  const handleExport = () => {
    window.location.href = `/api/boards/${id}/export`
  }

  if (showAuth) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h2>Join Board</h2>
          <p>Enter your display name to start collaborating</p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Your name..."
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              autoFocus
            />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>
    )
  }

  if (!board) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  return (
    <div className="board-page">
      <div className="board-header">
        <h1>{board.title}</h1>
        <div className="board-header-actions">
          <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>
            Joined as {displayName}
          </span>
          <button onClick={handleExport}>Export CSV</button>
          <Link to="/">All Boards</Link>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {board.columns.map(column => (
            <div key={column.id} className="column">
              <div className="column-header">{column.title}</div>
              <Droppable droppableId={String(column.id)}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`column-cards ${snapshot.isDraggingOver ? 'column-dragging-over' : ''}`}
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

          <form className="add-column-form" onSubmit={handleAddColumn}>
            <input
              type="text"
              placeholder="New column title..."
              value={newColumnTitle}
              onChange={e => setNewColumnTitle(e.target.value)}
            />
            <button type="submit">Add Column</button>
          </form>
        </div>
      </DragDropContext>
    </div>
  )
}
