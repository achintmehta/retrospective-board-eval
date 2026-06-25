import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { DragDropContext } from '@hello-pangea/dnd'
import { io } from 'socket.io-client'
import GuestAuthModal from '../components/GuestAuthModal.jsx'
import Column from '../components/Column.jsx'

const AUTHOR_KEY = 'retro_author_name'

let socket = null

function getSocket() {
  if (!socket || !socket.connected) {
    socket = io({ transports: ['websocket', 'polling'] })
  }
  return socket
}

export default function BoardPage() {
  const { id: boardId } = useParams()
  const navigate = useNavigate()
  const [board, setBoard] = useState(null)
  const [authorName, setAuthorName] = useState(() => sessionStorage.getItem(AUTHOR_KEY) || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColTitle, setNewColTitle] = useState('')
  const [sock, setSock] = useState(null)

  // Load board data
  useEffect(() => {
    fetch(`/api/boards/${boardId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Board not found')
        return r.json()
      })
      .then(setBoard)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [boardId])

  // Set up socket once we have author name
  useEffect(() => {
    if (!authorName) return

    const s = getSocket()
    setSock(s)
    s.emit('join_board', boardId)

    s.on('card_added', ({ columnId, card }) => {
      setBoard((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: [card, ...col.cards] }
              : col
          ),
        }
      })
    })

    s.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoard((prev) => {
        if (!prev) return prev
        let movedCard = null
        const withoutCard = prev.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => {
            if (c.id === cardId) { movedCard = c; return false }
            return true
          }),
        }))
        if (!movedCard) return prev
        return {
          ...prev,
          columns: withoutCard.map((col) => {
            if (col.id !== newColumnId) return col
            const cards = [...col.cards]
            cards.splice(newPosition, 0, movedCard)
            return { ...col, cards }
          }),
        }
      })
    })

    s.on('comment_added', ({ cardId, comment }) => {
      setBoard((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === cardId
                ? { ...card, comments: [...card.comments, comment] }
                : card
            ),
          })),
        }
      })
    })

    s.on('column_added', (column) => {
      setBoard((prev) => {
        if (!prev) return prev
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] }
      })
    })

    return () => {
      s.off('card_added')
      s.off('card_moved')
      s.off('comment_added')
      s.off('column_added')
    }
  }, [authorName, boardId])

  const handleConfirmName = useCallback((name) => {
    sessionStorage.setItem(AUTHOR_KEY, name)
    setAuthorName(name)
  }, [])

  const handleDragEnd = useCallback((result) => {
    if (!result.destination || !sock) return
    const { draggableId: cardId, source, destination } = result
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev
      let movedCard = null
      const withoutCard = prev.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((c) => {
          if (c.id === cardId) { movedCard = c; return false }
          return true
        }),
      }))
      if (!movedCard) return prev
      return {
        ...prev,
        columns: withoutCard.map((col) => {
          if (col.id !== destination.droppableId) return col
          const cards = [...col.cards]
          cards.splice(destination.index, 0, movedCard)
          return { ...col, cards }
        }),
      }
    })

    sock.emit('move_card', {
      boardId,
      cardId,
      newColumnId: destination.droppableId,
      newPosition: destination.index,
    })
  }, [boardId, sock])

  async function handleAddColumn(e) {
    e.preventDefault()
    const title = newColTitle.trim()
    if (!title) return
    await fetch(`/api/boards/${boardId}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    setNewColTitle('')
    setAddingColumn(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading board…</div>
  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: 'var(--danger)', marginBottom: 16 }}>{error}</p>
      <button onClick={() => navigate('/')} style={{ background: 'var(--primary)', color: '#fff' }}>
        Back to Boards
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {!authorName && <GuestAuthModal onConfirm={handleConfirmName} />}

      {/* Header */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: 'var(--shadow)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', color: 'var(--text-muted)', padding: '4px 8px', border: '1px solid var(--border)' }}
        >
          ← Boards
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, flex: 1 }}>{board.title}</h1>
        {authorName && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Joined as <strong>{authorName}</strong>
          </span>
        )}
        <a
          href={`/api/boards/${boardId}/export`}
          download
          style={{
            background: 'var(--primary)', color: '#fff',
            padding: '8px 16px', borderRadius: 'var(--radius)',
            fontSize: 13,
          }}
        >
          Export CSV
        </a>
      </div>

      {/* Board */}
      <div style={{
        flex: 1, overflowX: 'auto', padding: '24px',
        display: 'flex', alignItems: 'flex-start', gap: 16,
      }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              authorName={authorName}
              socket={sock}
              boardId={boardId}
            />
          ))}
        </DragDropContext>

        {/* Add column */}
        <div style={{ minWidth: 280 }}>
          {addingColumn ? (
            <form onSubmit={handleAddColumn} style={{
              background: '#ebecf0', borderRadius: 10, padding: '12px 10px',
            }}>
              <input
                autoFocus
                placeholder="Column title…"
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                style={{ marginBottom: 8 }}
                onKeyDown={(e) => { if (e.key === 'Escape') setAddingColumn(false) }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="submit" disabled={!newColTitle.trim()} style={{ background: 'var(--primary)', color: '#fff', flex: 1 }}>
                  Add Column
                </button>
                <button type="button" onClick={() => setAddingColumn(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.5)',
                border: '1px dashed var(--border)', borderRadius: 10,
                padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'left',
              }}
            >
              + Add a column
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
