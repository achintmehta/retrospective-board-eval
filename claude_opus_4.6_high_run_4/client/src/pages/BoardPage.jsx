import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [socket, setSocket] = useState(null)
  const [displayName, setDisplayName] = useState(() => sessionStorage.getItem('retroDisplayName') || '')
  const [nameInput, setNameInput] = useState('')
  const [newCardText, setNewCardText] = useState({})
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [selectedCard, setSelectedCard] = useState(null)
  const [commentText, setCommentText] = useState('')

  const isAuthenticated = displayName.length > 0

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then(res => res.json())
      .then(setBoard)
  }, [id])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    if (!isAuthenticated) return

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

    s.on('card_moved', ({ card, targetColumnId }) => {
      setBoard(prev => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.id === targetColumnId
              ? [...col.cards.filter(c => c.id !== card.id), { ...card, comments: card.comments || findCardComments(prev, card.id) }]
              : col.cards.filter(c => c.id !== card.id),
          })),
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
            cards: col.cards.map(c =>
              c.id === cardId ? { ...c, comments: [...(c.comments || []), comment] } : c
            ),
          })),
        }
      })
      setSelectedCard(prev => {
        if (prev && prev.id === cardId) {
          return { ...prev, comments: [...(prev.comments || []), comment] }
        }
        return prev
      })
    })

    setSocket(s)
    return () => {
      s.emit('leave_board', id)
      s.disconnect()
    }
  }, [id, isAuthenticated])

  function findCardComments(boardState, cardId) {
    for (const col of boardState.columns) {
      const card = col.cards.find(c => c.id === cardId)
      if (card) return card.comments || []
    }
    return []
  }

  const handleJoin = (e) => {
    e.preventDefault()
    if (!nameInput.trim()) return
    const name = nameInput.trim()
    sessionStorage.setItem('retroDisplayName', name)
    setDisplayName(name)
  }

  const handleAddCard = (columnId) => {
    const text = (newCardText[columnId] || '').trim()
    if (!text || !socket) return
    socket.emit('add_card', { columnId, content: text, authorName: displayName })
    setNewCardText(prev => ({ ...prev, [columnId]: '' }))
  }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!newColumnTitle.trim()) return
    const res = await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() }),
    })
    const col = await res.json()
    col.cards = []
    setBoard(prev => prev ? { ...prev, columns: [...prev.columns, col] } : prev)
    setNewColumnTitle('')
  }

  const handleAddComment = () => {
    if (!commentText.trim() || !socket || !selectedCard) return
    socket.emit('add_comment', { cardId: selectedCard.id, content: commentText.trim(), authorName: displayName })
    setCommentText('')
  }

  const handleDragEnd = (result) => {
    if (!result.destination || !socket) return
    const { draggableId, destination } = result
    const cardId = parseInt(draggableId)
    const targetColumnId = parseInt(destination.droppableId)
    const targetPosition = destination.index
    socket.emit('move_card', { cardId, targetColumnId, targetPosition })
  }

  const handleExport = () => {
    window.location.href = `/api/boards/${id}/export`
  }

  if (!board) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f0f2f5',
      }}>
        <div style={{
          background: '#fff', padding: 32, borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: 360,
        }}>
          <h2 style={{ marginBottom: 8 }}>Join Board</h2>
          <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
            Enter your display name to participate in "{board.title}"
          </p>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Your name..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
              autoFocus
            />
            <button
              type="submit"
              style={{ width: '100%', background: '#4361ee', color: '#fff', fontWeight: 600, padding: 10 }}
            >
              Join
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ color: '#4361ee', fontSize: 14 }}>All Boards</Link>
          <h1 style={{ fontSize: 24, margin: 0 }}>{board.title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#888' }}>Logged in as <strong>{displayName}</strong></span>
          <button
            onClick={handleExport}
            style={{ background: '#e2e8f0', color: '#333', fontWeight: 500 }}
          >
            Export CSV
          </button>
        </div>
      </div>

      <form onSubmit={handleAddColumn} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="New column title..."
          value={newColumnTitle}
          onChange={(e) => setNewColumnTitle(e.target.value)}
          style={{ width: 200 }}
        />
        <button type="submit" style={{ background: '#4361ee', color: '#fff', fontWeight: 500, fontSize: 13 }}>
          Add Column
        </button>
      </form>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 20 }}>
          {board.columns.map(col => (
            <Droppable key={col.id} droppableId={String(col.id)}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    background: snapshot.isDraggingOver ? '#e8ecf4' : '#e9ecef',
                    borderRadius: 10,
                    padding: 12,
                    minWidth: 280,
                    maxWidth: 320,
                    flex: '0 0 300px',
                  }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, color: '#333' }}>
                    {col.title}
                  </h3>

                  {col.cards.map((card, index) => (
                    <Draggable key={card.id} draggableId={String(card.id)} index={index}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          onClick={() => setSelectedCard(card)}
                          style={{
                            ...prov.draggableProps.style,
                            background: '#fff',
                            borderRadius: 8,
                            padding: '10px 12px',
                            marginBottom: 8,
                            boxShadow: snap.isDragging
                              ? '0 4px 12px rgba(0,0,0,0.15)'
                              : '0 1px 2px rgba(0,0,0,0.06)',
                            cursor: 'pointer',
                          }}
                        >
                          <p style={{ fontSize: 14, margin: 0 }}>{card.content}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                            <span style={{ fontSize: 11, color: '#888' }}>{card.author_name}</span>
                            {card.comments && card.comments.length > 0 && (
                              <span style={{ fontSize: 11, color: '#4361ee' }}>
                                {card.comments.length} comment{card.comments.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  <div style={{ marginTop: 8 }}>
                    <textarea
                      placeholder="Add a card..."
                      value={newCardText[col.id] || ''}
                      onChange={(e) => setNewCardText(prev => ({ ...prev, [col.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddCard(col.id)
                        }
                      }}
                      rows={2}
                      style={{ width: '100%', fontSize: 13, resize: 'vertical' }}
                    />
                    <button
                      onClick={() => handleAddCard(col.id)}
                      style={{
                        marginTop: 4, width: '100%',
                        background: '#4361ee', color: '#fff', fontSize: 13, fontWeight: 500,
                      }}
                    >
                      Add Card
                    </button>
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {selectedCard && (
        <div
          onClick={() => setSelectedCard(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 24,
              width: 480, maxHeight: '80vh', overflow: 'auto',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 500 }}>{selectedCard.content}</p>
                <span style={{ fontSize: 12, color: '#888' }}>by {selectedCard.author_name}</span>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                style={{ background: 'transparent', fontSize: 20, color: '#888', padding: '0 4px' }}
              >
                ×
              </button>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Comments ({selectedCard.comments?.length || 0})
            </h4>

            <div style={{ marginBottom: 12 }}>
              {(selectedCard.comments || []).map(comment => (
                <div key={comment.id} style={{
                  background: '#f7f8fa', borderRadius: 8, padding: '8px 12px', marginBottom: 6,
                }}>
                  <p style={{ fontSize: 13, margin: 0 }}>{comment.content}</p>
                  <span style={{ fontSize: 11, color: '#888' }}>
                    {comment.author_name} · {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddComment()
                }}
                style={{ flex: 1 }}
                autoFocus
              />
              <button
                onClick={handleAddComment}
                style={{ background: '#4361ee', color: '#fff', fontWeight: 500 }}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BoardPage
