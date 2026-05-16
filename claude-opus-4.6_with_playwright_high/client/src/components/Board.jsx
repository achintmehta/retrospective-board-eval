import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Column from './Column.jsx';

export default function Board({ board, setBoard, userName }) {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [addColumnTitle, setAddColumnTitle] = useState('');

  useEffect(() => {
    const socket = io({ transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join_board', board.id);

    socket.on('card_added', ({ columnId, card }) => {
      setBoard(prev => ({
        ...prev,
        columns: prev.columns.map(col =>
          col.id === columnId
            ? { ...col, cards: [...col.cards, card] }
            : col
        ),
      }));
    });

    socket.on('card_moved', ({ cardId, sourceColumnId, targetColumnId, targetPosition, card }) => {
      setBoard(prev => {
        const columns = prev.columns.map(col => {
          if (col.id === sourceColumnId) {
            return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
          }
          return col;
        });
        return {
          ...prev,
          columns: columns.map(col => {
            if (col.id === targetColumnId) {
              const cards = [...col.cards];
              cards.splice(targetPosition, 0, { ...card, comments: card.comments || [] });
              return { ...col, cards };
            }
            return col;
          }),
        };
      });
    });

    socket.on('comment_added', ({ cardId, columnId, comment }) => {
      setBoard(prev => ({
        ...prev,
        columns: prev.columns.map(col =>
          col.id === columnId
            ? {
                ...col,
                cards: col.cards.map(card =>
                  card.id === cardId
                    ? { ...card, comments: [...(card.comments || []), comment] }
                    : card
                ),
              }
            : col
        ),
      }));
    });

    return () => socket.disconnect();
  }, [board.id, setBoard]);

  function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = board.columns.find(c => c.id === source.droppableId);
    const movedCard = sourceCol.cards[source.index];

    setBoard(prev => {
      const columns = prev.columns.map(col => {
        if (col.id === source.droppableId) {
          const cards = [...col.cards];
          cards.splice(source.index, 1);
          return { ...col, cards };
        }
        return col;
      });
      return {
        ...prev,
        columns: columns.map(col => {
          if (col.id === destination.droppableId) {
            const cards = [...col.cards];
            cards.splice(destination.index, 0, movedCard);
            return { ...col, cards };
          }
          return col;
        }),
      };
    });

    socketRef.current.emit('move_card', {
      cardId: draggableId,
      sourceColumnId: source.droppableId,
      targetColumnId: destination.droppableId,
      targetPosition: destination.index,
      boardId: board.id,
    });
  }

  function handleAddCard(columnId, content) {
    socketRef.current.emit('add_card', {
      columnId,
      content,
      authorName: userName,
      boardId: board.id,
    });
  }

  function handleAddComment(cardId, columnId, content) {
    socketRef.current.emit('add_comment', {
      cardId,
      columnId,
      content,
      authorName: userName,
      boardId: board.id,
    });
  }

  async function handleAddColumn(e) {
    e.preventDefault();
    if (!addColumnTitle.trim()) return;
    const res = await fetch(`/api/boards/${board.id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: addColumnTitle.trim() }),
    });
    const column = await res.json();
    column.cards = [];
    setBoard(prev => ({ ...prev, columns: [...prev.columns, column] }));
    setAddColumnTitle('');
  }

  return (
    <div style={{ padding: 20, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        marginBottom: 20, justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'var(--border)', color: 'var(--text)', padding: '6px 12px' }}
          >
            Back
          </button>
          <h1 style={{ fontSize: 22, margin: 0 }}>{board.title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a
            href={`/api/boards/${board.id}/export`}
            download
            style={{
              background: 'var(--primary)', color: '#fff', padding: '6px 12px',
              borderRadius: 6, textDecoration: 'none', fontSize: 13,
            }}
          >
            Export CSV
          </a>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Joined as {userName}
          </span>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', flex: 1, paddingBottom: 20, alignItems: 'flex-start' }}>
          {board.columns && board.columns.map(col => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}

          <form
            onSubmit={handleAddColumn}
            style={{
              minWidth: 280, background: 'var(--column-bg)', borderRadius: 8,
              padding: 12, border: '1px dashed var(--border)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <input
              value={addColumnTitle}
              onChange={e => setAddColumnTitle(e.target.value)}
              placeholder="Add column..."
              style={{ width: '100%' }}
            />
            <button
              type="submit"
              style={{ background: 'var(--primary)', color: '#fff', alignSelf: 'flex-start' }}
            >
              Add Column
            </button>
          </form>
        </div>
      </DragDropContext>
    </div>
  );
}
