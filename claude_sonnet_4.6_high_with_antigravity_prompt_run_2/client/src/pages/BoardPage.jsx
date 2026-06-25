import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { DragDropContext } from '@hello-pangea/dnd'
import { io } from 'socket.io-client'
import GuestAuthModal from '../components/GuestAuthModal'
import Column from '../components/Column'

function initials(name) {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userName, setUserName] = useState(() => sessionStorage.getItem('retroUserName') || '')
  const [connected, setConnected] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [addColName, setAddColName] = useState('')
  const [showAddCol, setShowAddCol] = useState(false)
  const socketRef = useRef(null)

  // Fetch initial board data
  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(r => { if (!r.ok) throw new Error('Board not found'); return r.json() })
      .then(data => { setBoard(data); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [id])

  // Setup socket once user has authenticated
  useEffect(() => {
    if (!userName) return

    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join_board', { boardId: id })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('card_added', (card) => {
      setBoard(prev => {
        if (!prev) return prev
        const cols = prev.columns.map(col => {
          if (col.id !== card.column_id) return col
          // Avoid duplicate
          if (col.cards.some(c => c.id === card.id)) return col
          return { ...col, cards: [...col.cards, { ...card, comments: [] }] }
        })
        return { ...prev, columns: cols }
      })
    })

    socket.on('card_moved', ({ cardId, targetColumnId, targetPosition }) => {
      setBoard(prev => {
        if (!prev) return prev
        let movedCard = null
        const stripped = prev.columns.map(col => {
          const found = col.cards.find(c => c.id === cardId)
          if (found) movedCard = found
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) }
        })
        if (!movedCard) return prev
        const updated = stripped.map(col => {
          if (col.id !== targetColumnId) return col
          const newCards = [...col.cards]
          newCards.splice(targetPosition, 0, { ...movedCard, column_id: targetColumnId })
          return { ...col, cards: newCards }
        })
        return { ...prev, columns: updated }
      })
    })

    socket.on('comment_added', (comment) => {
      setBoard(prev => {
        if (!prev) return prev
        const cols = prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card => {
            if (card.id !== comment.card_id) return card
            if (card.comments.some(c => c.id === comment.id)) return card
            return { ...card, comments: [...card.comments, comment] }
          }),
        }))
        return { ...prev, columns: cols }
      })
      // Update selected card comments live
      setSelectedCard(prev => {
        if (!prev || prev.id !== comment.card_id) return prev
        if (prev.comments.some(c => c.id === comment.id)) return prev
        return { ...prev, comments: [...prev.comments, comment] }
      })
    })

    socket.on('column_added', (col) => {
      setBoard(prev => {
        if (!prev || prev.columns.some(c => c.id === col.id)) return prev
        return { ...prev, columns: [...prev.columns, { ...col, cards: [] }] }
      })
    })

    return () => socket.disconnect()
  }, [id, userName])

  function handleJoin(name) {
    sessionStorage.setItem('retroUserName', name)
    setUserName(name)
  }

  function handleDragEnd(result) {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const cardId = draggableId
    const targetColumnId = destination.droppableId
    const targetPosition = destination.index

    // Optimistic update
    setBoard(prev => {
      if (!prev) return prev
      let movedCard = null
      const stripped = prev.columns.map(col => {
        const found = col.cards.find(c => c.id === cardId)
        if (found) movedCard = found
        return { ...col, cards: col.cards.filter(c => c.id !== cardId) }
      })
      if (!movedCard) return prev
      const updated = stripped.map(col => {
        if (col.id !== targetColumnId) return col
        const newCards = [...col.cards]
        newCards.splice(targetPosition, 0, { ...movedCard, column_id: targetColumnId })
        return { ...col, cards: newCards }
      })
      return { ...prev, columns: updated }
    })

    socketRef.current?.emit('move_card', { boardId: id, cardId, targetColumnId, targetPosition })
  }

  function handleAddCard(columnId, content) {
    socketRef.current?.emit('add_card', { boardId: id, columnId, content, authorName: userName })
  }

  function handleAddComment(e) {
    e.preventDefault()
    if (!newComment.trim() || !selectedCard) return
    socketRef.current?.emit('add_comment', {
      boardId: id,
      cardId: selectedCard.id,
      content: newComment.trim(),
      authorName: userName,
    })
    setNewComment('')
  }

  async function handleAddColumn(e) {
    e.preventDefault()
    if (!addColName.trim()) return
    try {
      await fetch(`/api/boards/${id}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: addColName.trim() }),
      })
      setAddColName('')
      setShowAddCol(false)
    } catch {}
  }

  function handleExport() {
    window.open(`/api/boards/${id}/export`, '_blank')
  }

  // Sync selected card from board state so comments update
  useEffect(() => {
    if (!selectedCard) return
    setBoard(prev => {
      if (!prev) return prev
      // keep selectedCard in sync
      for (const col of prev.columns) {
        const found = col.cards.find(c => c.id === selectedCard.id)
        if (found) {
          setSelectedCard(sc => sc && sc.id === found.id ? found : sc)
        }
      }
      return prev
    })
  }, [board?.columns, selectedCard?.id])

  if (!userName) {
    return <GuestAuthModal onJoin={handleJoin} />
  }

  if (loading) return <div className="loading-spinner" aria-label="Loading board" />
  if (error) return <div className="error-message">{error}</div>
  if (!board) return null

  const currentSelectedCard = board.columns.flatMap(c => c.cards).find(c => c.id === selectedCard?.id) || selectedCard

  return (
    <>
      <div className="board-page">
        <header className="board-header">
          <div className="board-header-left">
            <Link to="/" className="btn btn-ghost btn-sm">← Back</Link>
            <h1 className="board-title" id="board-title">{board.title}</h1>
            <div className={`connection-badge ${connected ? 'connected' : 'disconnected'}`}>
              <div className="connection-dot" />
              {connected ? 'Live' : 'Reconnecting…'}
            </div>
          </div>

          <div className="board-header-actions">
            <div className="user-chip">
              <div className="user-chip-avatar">{initials(userName)}</div>
              {userName}
            </div>

            {showAddCol ? (
              <form className="add-column-form" onSubmit={handleAddColumn} id="add-column-form">
                <input
                  id="add-column-input"
                  className="input"
                  type="text"
                  placeholder="Column name"
                  value={addColName}
                  onChange={e => setAddColName(e.target.value)}
                  autoFocus
                  maxLength={40}
                />
                <button type="submit" className="btn btn-primary btn-sm" id="submit-column-btn" disabled={!addColName.trim()}>
                  Add
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowAddCol(false); setAddColName('') }}>
                  ✕
                </button>
              </form>
            ) : (
              <button id="show-add-column-btn" className="btn btn-ghost btn-sm" onClick={() => setShowAddCol(true)}>
                + Column
              </button>
            )}

            <button id="export-csv-btn" className="export-btn" onClick={handleExport}>
              ↓ Export CSV
            </button>
          </div>
        </header>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="board-columns-area" id="board-columns-area">
            {board.columns.map((col, i) => (
              <Column
                key={col.id}
                column={col}
                colorIndex={i}
                onAddCard={handleAddCard}
                onOpenComments={setSelectedCard}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {selectedCard && currentSelectedCard && (
        <div className="comments-overlay" onClick={e => { if (e.target === e.currentTarget) setSelectedCard(null) }} id="comments-overlay">
          <div className="comments-panel" id="comments-panel">
            <div className="comments-panel-header">
              <div className="comments-panel-card-content">{currentSelectedCard.content}</div>
              <button
                id="close-comments-btn"
                className="btn btn-ghost btn-sm btn-icon"
                onClick={() => setSelectedCard(null)}
                aria-label="Close comments"
              >
                ✕
              </button>
            </div>

            <div className="comments-list" id="comments-list">
              {currentSelectedCard.comments?.length === 0 ? (
                <div className="comments-empty">No comments yet. Be the first!</div>
              ) : (
                currentSelectedCard.comments?.map(c => (
                  <div key={c.id} className="comment-item" id={`comment-${c.id}`}>
                    <div className="comment-header">
                      <div className="comment-author-avatar">{initials(c.author_name)}</div>
                      <span className="comment-author-name">{c.author_name}</span>
                    </div>
                    <div className="comment-content">{c.content}</div>
                  </div>
                ))
              )}
            </div>

            <form className="comments-footer" onSubmit={handleAddComment} id="add-comment-form">
              <textarea
                id="comment-input"
                className="input"
                placeholder="Add a comment…"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={2}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(e) }
                }}
              />
              <button
                id="submit-comment-btn"
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!newComment.trim()}
              >
                Comment
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
