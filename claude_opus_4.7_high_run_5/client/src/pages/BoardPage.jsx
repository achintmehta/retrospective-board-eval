import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { api } from '../api';
import { getSocket } from '../socket';
import { getDisplayName, setDisplayName } from '../session';
import { useBoardState } from '../hooks/useBoardState';
import NamePrompt from '../components/NamePrompt.jsx';
import Column from '../components/Column.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const { board, setBoard, addColumn, addCard, moveCard, addComment } =
    useBoardState();

  const [name, setName] = useState(() => getDisplayName());
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  // Join board after we have a name
  useEffect(() => {
    if (!name) return;

    const socket = getSocket();

    function doJoin() {
      socket.emit(
        'join_board',
        { boardId, displayName: name },
        (response) => {
          if (!response || !response.ok) {
            setError((response && response.error) || 'Failed to join board');
            return;
          }
          setBoard(response.board);
          setJoined(true);
          setError('');
        }
      );
    }

    if (socket.connected) doJoin();
    socket.on('connect', doJoin);

    socket.on('card_added', addCard);
    socket.on('card_moved', (payload) => {
      moveCard({
        cardId: payload.cardId,
        fromColumnId: payload.fromColumnId,
        toColumnId: payload.toColumnId,
        newPosition: payload.newPosition,
      });
    });
    socket.on('comment_added', addComment);
    socket.on('column_added', addColumn);

    return () => {
      socket.off('connect', doJoin);
      socket.off('card_added');
      socket.off('card_moved');
      socket.off('comment_added');
      socket.off('column_added');
    };
  }, [boardId, name, setBoard, addCard, moveCard, addComment, addColumn]);

  const handleNameSubmit = useCallback((value) => {
    setDisplayName(value);
    setName(value);
  }, []);

  const handleAddCard = useCallback((columnId, content) => {
    getSocket().emit('add_card', { columnId, content }, (resp) => {
      if (!resp || !resp.ok) setError(resp?.error || 'Failed to add card');
    });
  }, []);

  const handleAddComment = useCallback((cardId, content) => {
    getSocket().emit('add_comment', { cardId, content }, (resp) => {
      if (!resp || !resp.ok) setError(resp?.error || 'Failed to add comment');
    });
  }, []);

  const handleDragEnd = useCallback(
    (result) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }
      // Optimistic local update
      moveCard({
        cardId: draggableId,
        fromColumnId: source.droppableId,
        toColumnId: destination.droppableId,
        newPosition: destination.index,
      });
      getSocket().emit(
        'move_card',
        {
          cardId: draggableId,
          toColumnId: destination.droppableId,
          newPosition: destination.index,
        },
        (resp) => {
          if (!resp || !resp.ok) setError(resp?.error || 'Failed to move card');
        }
      );
    },
    [moveCard]
  );

  async function handleAddColumn(e) {
    e.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) return;
    try {
      await api.addColumn(boardId, title);
      setNewColumnTitle('');
      setShowAddColumn(false);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!name) {
    return <NamePrompt onSubmit={handleNameSubmit} />;
  }

  if (error && !board) {
    return (
      <div className="board-error">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!board || !joined) {
    return <p className="loading">Joining board…</p>;
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div>
          <h1>{board.title}</h1>
          <span className="muted">
            Joined as <strong>{name}</strong>
          </span>
        </div>
        <div className="board-actions">
          <a
            href={api.exportUrl(boardId)}
            className="btn"
            download
            rel="noopener"
          >
            Export to CSV
          </a>
        </div>
      </header>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="columns">
          {board.columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onAddCard={handleAddCard}
              onAddComment={handleAddComment}
            />
          ))}

          <div className="column add-column">
            {showAddColumn ? (
              <form onSubmit={handleAddColumn} className="add-column-form">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  placeholder="New column title"
                  autoFocus
                  maxLength={60}
                  aria-label="New column title"
                />
                <div className="row">
                  <button type="submit" disabled={!newColumnTitle.trim()}>
                    Add
                  </button>
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      setShowAddColumn(false);
                      setNewColumnTitle('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="add-column-btn"
                onClick={() => setShowAddColumn(true)}
              >
                + Add column
              </button>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}
