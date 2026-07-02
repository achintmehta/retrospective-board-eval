import { useCallback, useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { api } from '../api';
import { getSocket } from '../socket';
import { useDisplayName } from '../useDisplayName';
import { colorFor, initials, formatTime, swatchFor } from '../ui';
import GuestAuthModal from '../components/GuestAuthModal';
import CardDetailModal from '../components/CardDetailModal';
import type { Board, Card as CardT, Comment } from '../types';

export default function BoardPage() {
  const { boardId } = useParams();
  const { displayName, setDisplayName } = useDisplayName();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [newColTitle, setNewColTitle] = useState('');
  const socketRef = useRef(getSocket());

  const loadBoard = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const data = await api.getBoard(boardId);
      setBoard(data);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    if (!boardId || !displayName) return;
    const socket = socketRef.current;
    if (!socket.connected) socket.connect();

    socket.emit('join_board', { boardId, displayName });

    const onCardAdded = (payload: {
      boardId: string;
      columnId: string;
      card: CardT;
    }) => {
      if (payload.boardId !== boardId) return;
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === payload.columnId
              ? { ...col, cards: [...col.cards, payload.card] }
              : col
          ),
        };
      });
    };

    const onCardMoved = (payload: {
      boardId: string;
      columnOrder: Record<string, string[]>;
    }) => {
      if (payload.boardId !== boardId) return;
      setBoard((prev) => {
        if (!prev) return prev;
        const cardMap = new Map<string, CardT>();
        prev.columns.forEach((col) =>
          col.cards.forEach((card) => cardMap.set(card.id, card))
        );
        return {
          ...prev,
          columns: prev.columns.map((col) => {
            const orderedIds = payload.columnOrder[col.id] ?? [];
            const cards = orderedIds
              .map((id, index) => {
                const card = cardMap.get(id);
                if (!card) return null;
                return { ...card, column_id: col.id, position: index };
              })
              .filter((c): c is CardT => c !== null);
            return { ...col, cards };
          }),
        };
      });
    };

    const onCommentAdded = (payload: {
      boardId: string;
      cardId: string;
      comment: Comment;
    }) => {
      if (payload.boardId !== boardId) return;
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((card) =>
              card.id === payload.cardId
                ? { ...card, comments: [...card.comments, payload.comment] }
                : card
            ),
          })),
        };
      });
    };

    const onReconnect = () => {
      socket.emit('join_board', { boardId, displayName });
      loadBoard();
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
      socket.io.off('reconnect', onReconnect);
    };
  }, [boardId, displayName, loadBoard]);

  function handleDragEnd(result: DropResult) {
    if (!result.destination || !boardId) return;
    const { draggableId, source, destination } = result;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    setBoard((prev) => {
      if (!prev) return prev;
      const fromCol = prev.columns.find((c) => c.id === source.droppableId);
      const toCol = prev.columns.find((c) => c.id === destination.droppableId);
      if (!fromCol || !toCol) return prev;

      const card = fromCol.cards.find((c) => c.id === draggableId);
      if (!card) return prev;

      const newFromCards = fromCol.cards.filter((c) => c.id !== draggableId);
      const newToCards =
        fromCol.id === toCol.id ? newFromCards.slice() : toCol.cards.slice();
      newToCards.splice(destination.index, 0, { ...card, column_id: toCol.id });

      return {
        ...prev,
        columns: prev.columns.map((col) => {
          if (col.id === fromCol.id && fromCol.id !== toCol.id)
            return { ...col, cards: newFromCards };
          if (col.id === toCol.id) return { ...col, cards: newToCards };
          return col;
        }),
      };
    });

    socketRef.current.emit('move_card', {
      boardId,
      cardId: draggableId,
      toColumnId: destination.droppableId,
      toPosition: destination.index,
    });
  }

  function handleAddCard(columnId: string, content: string) {
    if (!boardId || !displayName) return;
    socketRef.current.emit('add_card', {
      boardId,
      columnId,
      content,
      authorName: displayName,
    });
  }

  function handleAddComment(cardId: string, content: string) {
    if (!boardId || !displayName) return;
    socketRef.current.emit('add_comment', {
      boardId,
      cardId,
      content,
      authorName: displayName,
    });
  }

  async function handleAddColumn(e: FormEvent) {
    e.preventDefault();
    if (!boardId) return;
    const trimmed = newColTitle.trim();
    if (!trimmed) return;
    try {
      const col = await api.createColumn(boardId, trimmed);
      setBoard((prev) =>
        prev
          ? { ...prev, columns: [...prev.columns, { ...col, cards: [] }] }
          : prev
      );
      setNewColTitle('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const openCard = useMemo(() => {
    if (!board || !openCardId) return null;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === openCardId);
      if (found) return found;
    }
    return null;
  }, [board, openCardId]);

  if (!displayName) {
    return <GuestAuthModal onSubmit={setDisplayName} />;
  }

  if (loading && !board) {
    return (
      <div className="center-state">
        <div className="spinner" />
        <span>Loading board…</span>
      </div>
    );
  }

  if (error && !board) {
    return (
      <div className="center-state error-state">
        <strong>Couldn't load board</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!board) return null;

  return (
    <>
      <div className="board-topbar">
        <div className="board-title-block">
          <h1>{board.title}</h1>
          <div className="board-meta">
            <span className="who">
              <span
                className="avatar-chip"
                style={{ background: colorFor(displayName) }}
              >
                {initials(displayName)}
              </span>
              You're here as <strong>{displayName}</strong>
            </span>
            <span>·</span>
            <span>Created {formatTime(board.created_at)}</span>
          </div>
        </div>
        <div className="board-actions">
          <a
            className="icon-btn accent"
            href={api.exportUrl(board.id)}
            download
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Export CSV
          </a>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns-wrap">
          {board.columns.map((col, colIndex) => (
            <div className="column" key={col.id}>
              <div className="column-header">
                <div className="column-title">
                  <span
                    className="column-swatch"
                    style={{ background: swatchFor(colIndex) }}
                  />
                  {col.title}
                </div>
                <span className="column-count">{col.cards.length}</span>
              </div>

              <Droppable droppableId={col.id}>
                {(dropProvided, snapshot) => (
                  <div
                    ref={dropProvided.innerRef}
                    {...dropProvided.droppableProps}
                    className={`card-list ${
                      snapshot.isDraggingOver ? 'is-drop-target' : ''
                    }`}
                  >
                    {col.cards.map((card, index) => (
                      <Draggable
                        key={card.id}
                        draggableId={card.id}
                        index={index}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            className={`card ${
                              dragSnapshot.isDragging ? 'is-dragging' : ''
                            }`}
                            onDoubleClick={() => setOpenCardId(card.id)}
                          >
                            <div className="card-content">{card.content}</div>
                            <div className="card-footer">
                              <div className="card-author">
                                <span
                                  className="card-avatar"
                                  style={{ background: colorFor(card.author_name) }}
                                >
                                  {initials(card.author_name)}
                                </span>
                                <span>{card.author_name}</span>
                              </div>
                              <div className="card-actions">
                                <button
                                  className="card-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenCardId(card.id);
                                  }}
                                >
                                  {card.comments.length > 0
                                    ? `💬 ${card.comments.length}`
                                    : '💬 comment'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {dropProvided.placeholder}
                  </div>
                )}
              </Droppable>

              <AddCardForm onSubmit={(text) => handleAddCard(col.id, text)} />
            </div>
          ))}

          <form className="new-column-tile" onSubmit={handleAddColumn}>
            <div className="column-title">+ Add column</div>
            <input
              type="text"
              placeholder="Column title"
              value={newColTitle}
              onChange={(e) => setNewColTitle(e.target.value)}
              maxLength={60}
            />
            <button
              type="submit"
              className="add-card-btn"
              disabled={!newColTitle.trim()}
            >
              Create column
            </button>
          </form>
        </div>
      </DragDropContext>

      {openCard && (
        <CardDetailModal
          card={openCard}
          displayName={displayName}
          onClose={() => setOpenCardId(null)}
          onAddComment={handleAddComment}
        />
      )}
    </>
  );
}

function AddCardForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  }

  return (
    <form className="add-card-form" onSubmit={submit}>
      <textarea
        placeholder="What's on your mind?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit(e as unknown as FormEvent);
          }
        }}
      />
      <button type="submit" className="add-card-btn" disabled={!text.trim()}>
        Add card
      </button>
    </form>
  );
}
