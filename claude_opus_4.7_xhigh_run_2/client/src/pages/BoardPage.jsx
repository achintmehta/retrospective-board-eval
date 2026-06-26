import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { createColumnApi, exportBoardUrl, fetchBoard } from '../api.js';
import { getDisplayName, setDisplayName } from '../session.js';
import { getSocket } from '../socket.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import AddCardForm from '../components/AddCardForm.jsx';
import Card from '../components/Card.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const [board, setBoard] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayNameState] = useState(() => getDisplayName());
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const socketRef = useRef(null);

  const loadBoard = useCallback(async () => {
    try {
      const data = await fetchBoard(boardId);
      setBoard(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const join = () => socket.emit('join_board', { boardId });
    if (socket.connected) join();
    socket.on('connect', join);
    socket.on('reconnect', () => {
      join();
      loadBoard();
    });

    const onCardAdded = (card) => {
      setBoard((prev) => prev && applyCardAdded(prev, card));
    };
    const onCardMoved = (card) => {
      setBoard((prev) => prev && applyCardMoved(prev, card));
    };
    const onCommentAdded = (comment) => {
      setBoard((prev) => prev && applyCommentAdded(prev, comment));
    };
    const onColumnAdded = (column) => {
      setBoard((prev) => prev && applyColumnAdded(prev, column));
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.on('column_added', onColumnAdded);

    return () => {
      socket.off('connect', join);
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.off('column_added', onColumnAdded);
      socket.emit('leave_board', { boardId });
    };
  }, [boardId, loadBoard]);

  const onJoin = (name) => {
    setDisplayName(name);
    setDisplayNameState(name);
  };

  const onAddCard = (columnId, content, done) => {
    socketRef.current.emit(
      'add_card',
      { columnId, content, authorName: displayName },
      (res) => {
        if (!res?.ok) setError(res?.error || 'Failed to add card');
        done && done();
      }
    );
  };

  const onAddComment = (cardId, content, done) => {
    socketRef.current.emit(
      'add_comment',
      { cardId, content, authorName: displayName },
      (res) => {
        if (!res?.ok) setError(res?.error || 'Failed to add comment');
        done && done();
      }
    );
  };

  const onAddColumn = async (e) => {
    e.preventDefault();
    const trimmed = newColumnTitle.trim();
    if (!trimmed) return;
    try {
      await createColumnApi(boardId, trimmed);
      setNewColumnTitle('');
    } catch (err) {
      setError(err.message);
    }
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic update
    setBoard((prev) => prev && applyOptimisticMove(prev, draggableId, source, destination));

    socketRef.current.emit(
      'move_card',
      {
        cardId: draggableId,
        toColumnId: destination.droppableId,
        toPosition: destination.index,
      },
      (res) => {
        if (!res?.ok) {
          setError(res?.error || 'Failed to move card');
          loadBoard();
        }
      }
    );
  };

  const sortedColumns = useMemo(() => {
    if (!board) return [];
    return [...board.columns].sort((a, b) => a.position - b.position);
  }, [board]);

  if (loading) return <p>Loading…</p>;
  if (error && !board) return <p className="error">{error}</p>;
  if (!board) return null;
  if (!displayName) return <GuestAuthModal onSubmit={onJoin} />;

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <h2 className="board-title">{board.title}</h2>
        <div className="board-actions">
          <span className="muted">You: <strong>{displayName}</strong></span>
          <a className="button" href={exportBoardUrl(boardId)}>Export CSV</a>
        </div>
      </div>

      {error && <p className="error" onClick={() => setError('')}>{error} (dismiss)</p>}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-columns">
          {sortedColumns.map((col) => (
            <Droppable droppableId={col.id} key={col.id}>
              {(provided, snapshot) => (
                <div
                  className={`column ${snapshot.isDraggingOver ? 'drag-over' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h3 className="column-title">{col.title}</h3>
                  <div className="column-cards">
                    {[...col.cards]
                      .sort((a, b) => a.position - b.position)
                      .map((card, idx) => (
                        <Draggable draggableId={card.id} index={idx} key={card.id}>
                          {(dragProvided) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                            >
                              <Card
                                card={card}
                                dragHandleProps={dragProvided.dragHandleProps}
                                onAddComment={onAddComment}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                  <AddCardForm
                    onAdd={(content, done) => onAddCard(col.id, content, done)}
                  />
                </div>
              )}
            </Droppable>
          ))}

          <form className="column add-column" onSubmit={onAddColumn}>
            <h3>Add column</h3>
            <input
              type="text"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
              placeholder="Column title"
              maxLength={80}
              aria-label="New column title"
            />
            <button type="submit" disabled={!newColumnTitle.trim()}>Create</button>
          </form>
        </div>
      </DragDropContext>
    </div>
  );
}

function applyCardAdded(board, card) {
  return {
    ...board,
    columns: board.columns.map((col) =>
      col.id === card.column_id
        ? { ...col, cards: appendUnique(col.cards, { ...card, comments: [] }) }
        : col
    ),
  };
}

function applyCardMoved(board, card) {
  let removed = null;
  const without = board.columns.map((col) => {
    const found = col.cards.find((c) => c.id === card.id);
    if (found) removed = found;
    return { ...col, cards: col.cards.filter((c) => c.id !== card.id) };
  });
  return {
    ...board,
    columns: without.map((col) =>
      col.id === card.column_id
        ? {
            ...col,
            cards: appendUnique(col.cards, { ...card, comments: removed?.comments || [] }),
          }
        : col
    ),
  };
}

function applyCommentAdded(board, comment) {
  return {
    ...board,
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) =>
        card.id === comment.card_id
          ? { ...card, comments: appendUnique(card.comments || [], comment) }
          : card
      ),
    })),
  };
}

function applyColumnAdded(board, column) {
  if (board.columns.some((c) => c.id === column.id)) return board;
  return { ...board, columns: [...board.columns, { ...column, cards: [] }] };
}

function applyOptimisticMove(board, cardId, source, destination) {
  let moved = null;
  const stripped = board.columns.map((col) => {
    if (col.id !== source.droppableId) return col;
    const cards = [...col.cards].sort((a, b) => a.position - b.position);
    [moved] = cards.splice(source.index, 1);
    return { ...col, cards: cards.map((c, i) => ({ ...c, position: i })) };
  });
  if (!moved) return board;
  return {
    ...board,
    columns: stripped.map((col) => {
      if (col.id !== destination.droppableId) return col;
      const cards = [...col.cards].sort((a, b) => a.position - b.position);
      const insertAt = Math.min(destination.index, cards.length);
      cards.splice(insertAt, 0, { ...moved, column_id: col.id });
      return { ...col, cards: cards.map((c, i) => ({ ...c, position: i })) };
    }),
  };
}

function appendUnique(list, item) {
  if (list.some((x) => x.id === item.id)) {
    return list.map((x) => (x.id === item.id ? { ...x, ...item } : x));
  }
  return [...list, item];
}
