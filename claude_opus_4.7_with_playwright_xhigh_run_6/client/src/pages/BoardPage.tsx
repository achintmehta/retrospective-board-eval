import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  createColumn as apiCreateColumn,
  exportBoardUrl,
  getBoard,
} from "../api";
import type { BoardColumn, BoardDetail, Card, Comment } from "../types";
import { getSocket } from "../socket";
import { getDisplayName, setDisplayName } from "../session";
import GuestAuthModal from "../components/GuestAuthModal";
import AddCardForm from "../components/AddCardForm";
import AddColumnForm from "../components/AddColumnForm";
import CommentsModal from "../components/CommentsModal";

type SocketAck<T> =
  | { ok: true } & T
  | { ok: false; error: string };

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(
    (a, b) =>
      a.position - b.position ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

function upsertCard(
  board: BoardDetail,
  card: Card,
): BoardDetail {
  return {
    ...board,
    columns: board.columns.map((column) => {
      const containsCard = column.cards.some((c) => c.id === card.id);
      if (column.id === card.columnId) {
        const preservedComments =
          column.cards.find((c) => c.id === card.id)?.comments ?? [];
        const merged: Card = {
          ...card,
          comments: card.comments.length ? card.comments : preservedComments,
        };
        const others = column.cards.filter((c) => c.id !== card.id);
        return {
          ...column,
          cards: sortCards([...others, merged]),
        };
      }
      if (containsCard) {
        return {
          ...column,
          cards: column.cards.filter((c) => c.id !== card.id),
        };
      }
      return column;
    }),
  };
}

function appendComment(
  board: BoardDetail,
  comment: Comment,
): BoardDetail {
  return {
    ...board,
    columns: board.columns.map((column) => ({
      ...column,
      cards: column.cards.map((card) => {
        if (card.id !== comment.cardId) return card;
        if (card.comments.some((c) => c.id === comment.id)) return card;
        return { ...card, comments: [...card.comments, comment] };
      }),
    })),
  };
}

function addColumn(board: BoardDetail, column: BoardColumn): BoardDetail {
  if (board.columns.some((c) => c.id === column.id)) return board;
  return { ...board, columns: [...board.columns, column] };
}

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setName] = useState<string | null>(() => getDisplayName());
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const handleNameSubmit = useCallback((name: string) => {
    setDisplayName(name);
    setName(name);
  }, []);

  useEffect(() => {
    if (!boardId) return;
    let cancelled = false;
    setBoard(null);
    setError(null);
    getBoard(boardId)
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load board");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    if (!boardId || !displayName) return;

    const socket = getSocket();

    const handleConnect = () => {
      setConnected(true);
      socket.emit(
        "join_board",
        { boardId, displayName },
        (response: SocketAck<{ board: BoardDetail }>) => {
          if (response.ok) {
            setBoard(response.board);
          } else {
            setError(response.error);
          }
        },
      );
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleCardAdded = (payload: { card: Card }) => {
      setBoard((prev) => (prev ? upsertCard(prev, payload.card) : prev));
    };

    const handleCardMoved = (payload: { card: Card }) => {
      setBoard((prev) => (prev ? upsertCard(prev, payload.card) : prev));
    };

    const handleCommentAdded = (payload: { comment: Comment }) => {
      setBoard((prev) => (prev ? appendComment(prev, payload.comment) : prev));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("card_added", handleCardAdded);
    socket.on("card_moved", handleCardMoved);
    socket.on("comment_added", handleCommentAdded);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.emit("leave_board", { boardId });
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("card_added", handleCardAdded);
      socket.off("card_moved", handleCardMoved);
      socket.off("comment_added", handleCommentAdded);
    };
  }, [boardId, displayName]);

  const openCard = useMemo(() => {
    if (!board || !openCardId) return null;
    for (const column of board.columns) {
      const card = column.cards.find((c) => c.id === openCardId);
      if (card) return card;
    }
    return null;
  }, [board, openCardId]);

  const handleAddCard = useCallback(
    (columnId: string, content: string) => {
      if (!boardId || !displayName) return;
      const socket = getSocket();
      socket.emit(
        "add_card",
        { boardId, columnId, content, authorName: displayName },
        (response: SocketAck<{ card: Card }>) => {
          if (!response.ok) {
            setError(response.error);
          }
        },
      );
    },
    [boardId, displayName],
  );

  const handleAddComment = useCallback(
    (cardId: string, content: string) => {
      if (!boardId || !displayName) return;
      const socket = getSocket();
      socket.emit(
        "add_comment",
        { boardId, cardId, content, authorName: displayName },
        (response: SocketAck<{ comment: Comment }>) => {
          if (!response.ok) {
            setError(response.error);
          }
        },
      );
    },
    [boardId, displayName],
  );

  const handleAddColumn = useCallback(
    async (title: string) => {
      if (!boardId) return;
      try {
        const column = await apiCreateColumn(boardId, title);
        setBoard((prev) => (prev ? addColumn(prev, column) : prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add column");
      }
    },
    [boardId],
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || !boardId) return;
      const { draggableId, destination, source } = result;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }
      const socket = getSocket();
      socket.emit(
        "move_card",
        {
          boardId,
          cardId: draggableId,
          targetColumnId: destination.droppableId,
          targetIndex: destination.index,
        },
        (response: SocketAck<{ card: Card }>) => {
          if (!response.ok) {
            setError(response.error);
          }
        },
      );
    },
    [boardId],
  );

  if (!displayName) {
    return <GuestAuthModal onSubmit={handleNameSubmit} />;
  }

  if (error && !board) {
    return (
      <div className="board-page">
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="board-page">
        <p className="muted">Loading board…</p>
      </div>
    );
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div>
          <h1>{board.title}</h1>
          <p className="muted">
            You are joined as <strong>{displayName}</strong>{" "}
            <span className={connected ? "status connected" : "status disconnected"}>
              {connected ? "● live" : "● reconnecting…"}
            </span>
          </p>
        </div>
        <div className="board-actions">
          <a
            className="button"
            href={exportBoardUrl(board.id)}
            download
          >
            Export to CSV
          </a>
        </div>
      </header>

      {error && (
        <p className="error-text inline-error" onClick={() => setError(null)}>
          {error} (dismiss)
        </p>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board-columns">
          {board.columns.map((column) => (
            <div key={column.id} className="board-column">
              <header className="board-column-header">
                <h2>{column.title}</h2>
                <span className="muted">{column.cards.length}</span>
              </header>
              <Droppable droppableId={column.id} type="card">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={
                      "board-column-cards" +
                      (snapshot.isDraggingOver ? " is-dragging-over" : "")
                    }
                  >
                    {sortCards(column.cards).map((card, index) => (
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
                            className={
                              "card" + (dragSnapshot.isDragging ? " is-dragging" : "")
                            }
                            onClick={() => setOpenCardId(card.id)}
                          >
                            <p className="card-content">{card.content}</p>
                            <footer className="card-footer">
                              <span className="muted">{card.authorName}</span>
                              <span className="muted">
                                💬 {card.comments.length}
                              </span>
                            </footer>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
              <AddCardForm
                onSubmit={(content) => handleAddCard(column.id, content)}
              />
            </div>
          ))}
          <div className="board-column board-column-new">
            <AddColumnForm onSubmit={handleAddColumn} />
          </div>
        </div>
      </DragDropContext>

      {openCard && (
        <CommentsModal
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onSubmit={(content) => handleAddComment(openCard.id, content)}
        />
      )}
    </div>
  );
}
