import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  createColumn,
  exportBoardCsvUrl,
  fetchBoard,
} from '../api';
import { getSocket } from '../socket';
import { getDisplayName, setDisplayName } from '../session';
import GuestAuthModal from '../components/GuestAuthModal';
import AddCardForm from '../components/AddCardForm';
import AddColumnForm from '../components/AddColumnForm';
import CommentsModal from '../components/CommentsModal';
import type {
  BoardColumn,
  Card,
  Comment,
  FullBoard,
} from '../types';

interface AckResponse {
  ok: boolean;
  error?: string;
  card?: Card;
  comment?: Comment;
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<FullBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(
    getDisplayName()
  );
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const joinedRef = useRef<string | null>(null);

  const reload = useCallback(async () => {
    if (!boardId) return;
    try {
      const data = await fetchBoard(boardId);
      setBoard(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    fetchBoard(boardId)
      .then((data) => setBoard(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [boardId]);

  // Socket connection + board room join + event subscriptions.
  useEffect(() => {
    if (!boardId || !displayName) return;

    const socket = getSocket();

    const join = () => {
      socket.emit(
        'join_board',
        { boardId, displayName },
        (ack: AckResponse) => {
          if (ack?.ok) {
            joinedRef.current = boardId;
          } else if (ack?.error) {
            setError(ack.error);
          }
        }
      );
    };

    if (socket.connected) {
      join();
    }
    socket.on('connect', join);
    // On reconnects, refetch full board to avoid drift.
    socket.on('reconnect', () => {
      join();
      reload();
    });

    const onCardAdded = ({ card }: { card: Card }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.column_id
              ? {
                  ...col,
                  cards: col.cards.some((c) => c.id === card.id)
                    ? col.cards
                    : [...col.cards, { ...card, comments: [] }].sort(
                        (a, b) => a.position - b.position
                      ),
                }
              : col
          ),
        };
      });
    };

    const onCardMoved = ({
      cardId,
      toColumnId,
      toPosition,
    }: {
      cardId: string;
      toColumnId: string;
      toPosition: number;
    }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const movingCardRef: { current: Card | null } = { current: null };
        const stripped = prev.columns.map((col) => {
          const filtered = col.cards.filter((c) => {
            if (c.id === cardId) {
              movingCardRef.current = c;
              return false;
            }
            return true;
          });
          return { ...col, cards: filtered };
        });
        const movingCard = movingCardRef.current;
        if (!movingCard) return prev;
        const updatedCard: Card = {
          ...movingCard,
          column_id: toColumnId,
          position: toPosition,
        };
        return {
          ...prev,
          columns: stripped.map((col) => {
            if (col.id !== toColumnId) return col;
            const next = [...col.cards];
            const insertIndex = Math.min(
              Math.max(0, toPosition),
              next.length
            );
            next.splice(insertIndex, 0, updatedCard);
            return {
              ...col,
              cards: next.map((c, idx) => ({ ...c, position: idx })),
            };
          }),
        };
      });
    };

    const onCommentAdded = ({ comment }: { comment: Comment }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) => ({
            ...col,
            cards: col.cards.map((c) =>
              c.id === comment.card_id
                ? {
                    ...c,
                    comments: c.comments.some((x) => x.id === comment.id)
                      ? c.comments
                      : [...c.comments, comment],
                  }
                : c
            ),
          })),
        };
      });
    };

    socket.on('card_added', onCardAdded);
    socket.on('card_moved', onCardMoved);
    socket.on('comment_added', onCommentAdded);

    return () => {
      socket.off('connect', join);
      socket.off('reconnect');
      socket.off('card_added', onCardAdded);
      socket.off('card_moved', onCardMoved);
      socket.off('comment_added', onCommentAdded);
    };
  }, [boardId, displayName, reload]);

  const flashStatus = useCallback((message: string) => {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(null), 2500);
  }, []);

  const handleSetDisplayName = useCallback((name: string) => {
    setDisplayName(name);
    setDisplayNameState(name);
  }, []);

  const handleAddCard = useCallback(
    (columnId: string, content: string) => {
      if (!boardId || !displayName) return;
      const socket = getSocket();
      socket.emit(
        'add_card',
        { boardId, columnId, content, authorName: displayName },
        (ack: AckResponse) => {
          if (!ack?.ok && ack?.error) flashStatus(ack.error);
        }
      );
    },
    [boardId, displayName, flashStatus]
  );

  const handleAddComment = useCallback(
    (cardId: string, content: string) => {
      if (!boardId || !displayName) return;
      const socket = getSocket();
      socket.emit(
        'add_comment',
        { boardId, cardId, content, authorName: displayName },
        (ack: AckResponse) => {
          if (!ack?.ok && ack?.error) flashStatus(ack.error);
        }
      );
    },
    [boardId, displayName, flashStatus]
  );

  const handleAddColumn = useCallback(
    async (title: string) => {
      if (!boardId) return;
      try {
        const column = await createColumn(boardId, title);
        setBoard((prev) =>
          prev
            ? {
                ...prev,
                columns: [...prev.columns, { ...column, cards: [] }],
              }
            : prev
        );
      } catch (err) {
        flashStatus((err as Error).message);
      }
    },
    [boardId, flashStatus]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!boardId || !board) return;
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }

      // Optimistic local move so the UI feels instant. The server broadcast
      // will re-confirm the same position to all clients (including this one).
      setBoard((prev) => {
        if (!prev) return prev;
        const movingCardRef: { current: Card | null } = { current: null };
        const sourceStripped = prev.columns.map((col) => {
          if (col.id !== source.droppableId) return col;
          const next = [...col.cards];
          const [removed] = next.splice(source.index, 1);
          if (removed) movingCardRef.current = removed;
          return { ...col, cards: next };
        });
        const movingCard = movingCardRef.current;
        if (!movingCard) return prev;
        const movedCard: Card = {
          ...movingCard,
          column_id: destination.droppableId,
          position: destination.index,
        };
        const finalCols = sourceStripped.map((col) => {
          if (col.id !== destination.droppableId) return col;
          const next = [...col.cards];
          next.splice(destination.index, 0, movedCard);
          return {
            ...col,
            cards: next.map((c, idx) => ({ ...c, position: idx })),
          };
        });
        return { ...prev, columns: finalCols };
      });

      const socket = getSocket();
      socket.emit(
        'move_card',
        {
          boardId,
          cardId: draggableId,
          toColumnId: destination.droppableId,
          toPosition: destination.index,
        },
        (ack: AckResponse) => {
          if (!ack?.ok) {
            flashStatus(ack?.error ?? 'Failed to move card');
            // Re-sync from server to undo the optimistic update.
            reload();
          }
        }
      );
    },
    [boardId, board, flashStatus, reload]
  );

  const openCard = useMemo<Card | null>(() => {
    if (!board || !openCardId) return null;
    for (const col of board.columns) {
      const found = col.cards.find((c) => c.id === openCardId);
      if (found) return found;
    }
    return null;
  }, [board, openCardId]);

  if (!boardId) return <p>Invalid board.</p>;
  if (!displayName) {
    return <GuestAuthModal onSubmit={handleSetDisplayName} />;
  }

  if (loading) return <p>Loading board…</p>;
  if (error)
    return (
      <div className="error-panel">
        <p className="error-text">{error}</p>
        <Link to="/">Back to all boards</Link>
      </div>
    );
  if (!board) return null;

  return (
    <div className="board-page">
      <header className="board-header">
        <div>
          <h1>{board.title}</h1>
          <p className="muted">
            You are joined as <strong>{displayName}</strong>
          </p>
        </div>
        <div className="board-actions">
          <a
            className="button"
            href={exportBoardCsvUrl(board.id)}
            download
          >
            Export CSV
          </a>
        </div>
      </header>

      {statusMessage && <div className="status-toast">{statusMessage}</div>}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {board.columns.map((column) => (
            <ColumnView
              key={column.id}
              column={column}
              onAddCard={(content) => handleAddCard(column.id, content)}
              onOpenCard={(cardId) => setOpenCardId(cardId)}
            />
          ))}
          <div className="board-column-spacer">
            <AddColumnForm onAdd={handleAddColumn} />
          </div>
        </div>
      </DragDropContext>

      {openCard && (
        <CommentsModal
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onAddComment={(content) => handleAddComment(openCard.id, content)}
        />
      )}
    </div>
  );
}

function ColumnView({
  column,
  onAddCard,
  onOpenCard,
}: {
  column: BoardColumn;
  onAddCard: (content: string) => void;
  onOpenCard: (cardId: string) => void;
}) {
  return (
    <section className="board-column">
      <header className="board-column-header">
        <h2>{column.title}</h2>
        <span className="muted">{column.cards.length}</span>
      </header>
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`board-column-cards ${
              snapshot.isDraggingOver ? 'is-drag-over' : ''
            }`}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <article
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className={`retro-card ${
                      dragSnapshot.isDragging ? 'is-dragging' : ''
                    }`}
                    onClick={(e) => {
                      // dnd uses pointerdown; preventing focus stealing here is fine.
                      e.preventDefault();
                      onOpenCard(card.id);
                    }}
                  >
                    <p className="retro-card-content">{card.content}</p>
                    <footer className="retro-card-footer">
                      <span className="muted">{card.author_name}</span>
                      {card.comments.length > 0 && (
                        <span className="badge">
                          {card.comments.length}
                          {card.comments.length === 1
                            ? ' comment'
                            : ' comments'}
                        </span>
                      )}
                    </footer>
                  </article>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <AddCardForm onAdd={onAddCard} />
    </section>
  );
}
