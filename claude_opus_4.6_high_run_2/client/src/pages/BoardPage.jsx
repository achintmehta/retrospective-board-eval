import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import { DragDropContext } from '@hello-pangea/dnd'
import GuestAuthModal from '../components/GuestAuthModal'
import Column from '../components/Column'
import './BoardPage.css'

const API = '/api'

function BoardPage() {
  const { id } = useParams()
  const [board, setBoard] = useState(null)
  const [userName, setUserName] = useState(() => sessionStorage.getItem('retroUserName') || '')
  const [addColumnTitle, setAddColumnTitle] = useState('')
  const socketRef = useRef(null)

  const fetchBoard = useCallback(() => {
    fetch(`${API}/boards/${id}`)
      .then(res => res.json())
      .then(setBoard)
      .catch(console.error)
  }, [id])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    if (!userName) return

    const socket = io()
    socketRef.current = socket

    socket.emit('join_board', id)

    socket.on('card_added', (card) => {
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

    socket.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoard(prev => {
        if (!prev) return prev
        let movedCard = null
        const columnsWithout = prev.columns.map(col => {
          const idx = col.cards.findIndex(c => c.id === cardId)
          if (idx !== -1) {
            movedCard = col.cards[idx]
            return { ...col, cards: col.cards.filter(c => c.id !== cardId) }
          }
          return col
        })
        if (!movedCard) return prev
        movedCard = { ...movedCard, column_id: newColumnId, position: newPosition }
        const columns = columnsWithout.map(col => {
          if (col.id === newColumnId) {
            const cards = [...col.cards]
            cards.splice(newPosition, 0, movedCard)
            return { ...col, cards }
          }
          return col
        })
        return { ...prev, columns }
      })
    })

    socket.on('comment_added', (comment) => {
      setBoard(prev => {
        if (!prev) return prev
        const columns = prev.columns.map(col => ({
          ...col,
          cards: col.cards.map(card => {
            if (card.id === comment.card_id) {
              return { ...card, comments: [...(card.comments || []), comment] }
            }
            return card
          })
        }))
        return { ...prev, columns }
      })
    })

    socket.on('reconnect', () => {
      fetchBoard()
      socket.emit('join_board', id)
    })

    return () => { socket.disconnect() }
  }, [userName, id, fetchBoard])

  const handleJoin = (name) => {
    sessionStorage.setItem('retroUserName', name)
    setUserName(name)
  }

  const handleAddCard = (columnId, content) => {
    if (socketRef.current) {
      socketRef.current.emit('add_card', {
        boardId: id,
        columnId,
        content,
        authorName: userName
      })
    }
  }

  const handleAddComment = (cardId, content) => {
    if (socketRef.current) {
      socketRef.current.emit('add_comment', {
        boardId: id,
        cardId,
        content,
        authorName: userName
      })
    }
  }

  const handleDragEnd = (result) => {
    const { draggableId, source, destination } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const cardId = parseInt(draggableId)
    const newColumnId = parseInt(destination.droppableId)
    const newPosition = destination.index

    setBoard(prev => {
      if (!prev) return prev
      let movedCard = null
      const columnsWithout = prev.columns.map(col => {
        if (String(col.id) === source.droppableId) {
          const cards = [...col.cards]
          movedCard = cards.splice(source.index, 1)[0]
          return { ...col, cards }
        }
        return col
      })
      if (!movedCard) return prev
      movedCard = { ...movedCard, column_id: newColumnId, position: newPosition }
      const columns = columnsWithout.map(col => {
        if (col.id === newColumnId) {
          const cards = [...col.cards]
          cards.splice(destination.index, 0, movedCard)
          return { ...col, cards }
        }
        return col
      })
      return { ...prev, columns }
    })

    if (socketRef.current) {
      socketRef.current.emit('move_card', {
        boardId: id,
        cardId,
        newColumnId,
        newPosition
      })
    }
  }

  const handleAddColumn = async (e) => {
    e.preventDefault()
    if (!addColumnTitle.trim()) return
    await fetch(`${API}/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: addColumnTitle.trim() })
    })
    setAddColumnTitle('')
    fetchBoard()
  }

  const handleExport = () => {
    window.open(`${API}/boards/${id}/export`, '_blank')
  }

  if (!board) return <div className="loading">Loading...</div>
  if (!userName) return <GuestAuthModal onJoin={handleJoin} />

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-left">
          <Link to="/" className="back-link">&larr; Boards</Link>
          <h1>{board.title}</h1>
        </div>
        <div className="board-header-right">
          <span className="user-badge">{userName}</span>
          <button className="export-btn" onClick={handleExport}>Export CSV</button>
        </div>
      </header>

      <div className="columns-container">
        <DragDropContext onDragEnd={handleDragEnd}>
          {board.columns.map(column => (
            <Column
              key={column.id}
              column={column}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}
        </DragDropContext>

        <form className="add-column-form" onSubmit={handleAddColumn}>
          <input
            type="text"
            placeholder="New column..."
            value={addColumnTitle}
            onChange={(e) => setAddColumnTitle(e.target.value)}
          />
          <button type="submit">+ Add</button>
        </form>
      </div>
    </div>
  )
}

export default BoardPage
