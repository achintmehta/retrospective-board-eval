import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext } from '@hello-pangea/dnd'
import Column from '../components/Column'
import GuestAuthModal from '../components/GuestAuthModal'

function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [socket, setSocket] = useState(null)
  const [userName, setUserName] = useState(() => sessionStorage.getItem('retro_user') || '')
  const [columnTitle, setColumnTitle] = useState('')

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Board not found')
        return res.json()
      })
      .then(setBoard)
      .catch(() => navigate('/'))
  }, [id, navigate])

  useEffect(() => {
    if (!userName) return

    const s = io()
    s.emit('join_board', Number(id))
    setSocket(s)

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

    s.on('card_moved', (card) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col => ({
          ...col,
          cards: col.cards.filter(c => c.id !== card.id)
        })).map(col =>
          col.id === card.column_id
            ? { ...col, cards: [...col.cards, card].sort((a, b) => a.position - b.position) }
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
            card.id === comment.cardId
              ? { ...card, comments: [...(card.comments || []), comment] }
              : card
          )
        }))
        return { ...prev, columns }
      })
    })

    return () => {
      s.emit('leave_board', Number(id))
      s.disconnect()
    }
  }, [id, userName])

  const handleJoin = (name) => {
    sessionStorage.setItem('retro_user', name)
    setUserName(name)
  }

  const handleAddCard = useCallback((columnId, content) => {
    if (socket) {
      socket.emit('add_card', { columnId, content, authorName: userName })
    }
  }, [socket, userName])

  const handleAddComment = useCallback((cardId, content) => {
    if (socket) {
      socket.emit('add_comment', { cardId, content, authorName: userName })
    }
  }, [socket, userName])

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !socket) return
    const { draggableId, destination } = result
    socket.emit('move_card', {
      cardId: Number(draggableId),
      newColumnId: Number(destination.droppableId),
      newPosition: destination.index
    })
  }, [socket])

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!columnTitle.trim()) return
    const res = await fetch(`/api/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: columnTitle.trim() })
    })
    const col = await res.json()
    col.cards = []
    setBoard(prev => prev ? { ...prev, columns: [...prev.columns, col] } : prev)
    setColumnTitle('')
  }

  if (!userName) {
    return <GuestAuthModal onJoin={handleJoin} />
  }

  if (!board) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ padding: 20, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, flexWrap: 'wrap', gap: 8
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: '#e0e0e0', color: '#333', padding: '6px 12px', fontSize: 13 }}
          >
            Back
          </button>
          <h1 style={{ fontSize: 24, color: '#1a1a2e' }}>{board.title}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#888' }}>Joined as {userName}</span>
          <a
            href={`/api/boards/${id}/export`}
            download
            style={{
              background: '#27ae60', color: '#fff', padding: '8px 16px',
              borderRadius: 6, textDecoration: 'none', fontSize: 14, fontWeight: 500
            }}
          >
            Export CSV
          </a>
        </div>
      </div>

      <form onSubmit={handleAddColumn} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={columnTitle}
          onChange={e => setColumnTitle(e.target.value)}
          placeholder="New column title..."
          style={{ width: 240 }}
        />
        <button type="submit" style={{ background: '#4a90d9', color: '#fff' }}>
          Add Column
        </button>
      </form>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 16, flex: 1, overflowX: 'auto', paddingBottom: 16 }}>
          {board.columns.map(column => (
            <Column
              key={column.id}
              column={column}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}

export default BoardPage
