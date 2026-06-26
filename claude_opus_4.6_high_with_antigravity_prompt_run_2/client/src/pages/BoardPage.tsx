import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Column from '../components/Column';
import GuestAuthModal from '../components/GuestAuthModal';
import CommentsPanel from '../components/CommentsPanel';
import AddColumnForm from '../components/AddColumnForm';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  pointerWithin,
} from '@dnd-kit/core';

export interface Comment {
  id: string;
  card_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface Card {
  id: string;
  column_id: string;
  content: string;
  author_name: string;
  created_at: string;
  position: number;
  comments: Comment[];
}

export interface BoardColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  created_at: string;
  columns: BoardColumn[];
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userName, setUserName] = useState<string>(() => {
    return sessionStorage.getItem('retro-username') || '';
  });
  const [showAuth, setShowAuth] = useState(!userName);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [commentsCard, setCommentsCard] = useState<Card | null>(null);

  const fetchBoard = useCallback(async () => {
    const res = await fetch(`/api/boards/${id}`);
    if (!res.ok) {
      navigate('/');
      return;
    }
    const data = await res.json();
    setBoard(data);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    if (!userName || !id) return;

    const s = io({ transports: ['websocket', 'polling'] });
    setSocket(s);
    s.emit('join_board', id);

    s.on('card_added', ({ columnId, card }: { columnId: string; card: Card }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col =>
            col.id === columnId
              ? { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] }
              : col
          ),
        };
      });
    });

    s.on('card_moved', ({ cardId, sourceColumnId, targetColumnId, targetPosition }: {
      cardId: string;
      sourceColumnId: string;
      targetColumnId: string;
      targetPosition: number;
    }) => {
      setBoard(prev => {
        if (!prev) return prev;
        let movedCard: Card | undefined;
        const cols = prev.columns.map(col => {
          if (col.id === sourceColumnId) {
            const idx = col.cards.findIndex(c => c.id === cardId);
            if (idx !== -1) {
              movedCard = { ...col.cards[idx], column_id: targetColumnId };
              return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
            }
          }
          return col;
        });

        if (!movedCard) return prev;

        return {
          ...prev,
          columns: cols.map(col => {
            if (col.id === targetColumnId) {
              const newCards = [...col.cards];
              newCards.splice(targetPosition, 0, movedCard!);
              return { ...col, cards: newCards };
            }
            return col;
          }),
        };
      });
    });

    s.on('comment_added', ({ cardId, comment }: { cardId: string; comment: Comment }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map(col => ({
            ...col,
            cards: col.cards.map(card =>
              card.id === cardId
                ? { ...card, comments: [...card.comments, comment] }
                : card
            ),
          })),
        };
      });
      setCommentsCard(prev => {
        if (prev && prev.id === cardId) {
          return { ...prev, comments: [...prev.comments, comment] };
        }
        return prev;
      });
    });

    s.on('column_added', ({ column }: { column: BoardColumn }) => {
      setBoard(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: [...prev.columns, { ...column, cards: [] }],
        };
      });
    });

    return () => {
      s.emit('leave_board', id);
      s.disconnect();
    };
  }, [userName, id]);

  const handleAuth = (name: string) => {
    sessionStorage.setItem('retro-username', name);
    setUserName(name);
    setShowAuth(false);
  };

  const handleAddCard = (columnId: string, content: string) => {
    if (!socket) return;
    socket.emit('add_card', {
      boardId: id,
      columnId,
      content,
      authorName: userName,
    });
  };

  const handleAddComment = (cardId: string, content: string) => {
    if (!socket) return;
    socket.emit('add_comment', {
      boardId: id,
      cardId,
      content,
      authorName: userName,
    });
  };

  const handleAddColumn = (title: string) => {
    if (!socket) return;
    socket.emit('add_column', { boardId: id, title });
  };

  const handleExport = () => {
    window.open(`/api/boards/${id}/export`, '_blank');
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (!board) return;
    for (const col of board.columns) {
      const card = col.cards.find(c => c.id === active.id);
      if (card) {
        setActiveCard(card);
        break;
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !board || !socket) return;

    const cardId = active.id as string;
    const overId = over.id as string;

    let sourceCol: BoardColumn | undefined;
    let sourceIdx = -1;
    for (const col of board.columns) {
      const idx = col.cards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        sourceCol = col;
        sourceIdx = idx;
        break;
      }
    }
    if (!sourceCol) return;

    let targetCol: BoardColumn | undefined;
    let targetPosition = 0;

    targetCol = board.columns.find(col => col.id === overId);
    if (targetCol) {
      targetPosition = targetCol.cards.length;
    } else {
      for (const col of board.columns) {
        const idx = col.cards.findIndex(c => c.id === overId);
        if (idx !== -1) {
          targetCol = col;
          targetPosition = idx;
          break;
        }
      }
    }

    if (!targetCol) return;
    if (sourceCol.id === targetCol.id && sourceIdx === targetPosition) return;

    socket.emit('move_card', {
      boardId: id,
      cardId,
      sourceColumnId: sourceCol.id,
      targetColumnId: targetCol.id,
      targetPosition,
    });

    setBoard(prev => {
      if (!prev) return prev;
      let movedCard: Card | undefined;
      const cols = prev.columns.map(col => {
        if (col.id === sourceCol!.id) {
          const idx = col.cards.findIndex(c => c.id === cardId);
          if (idx !== -1) {
            movedCard = { ...col.cards[idx], column_id: targetCol!.id };
            return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
          }
        }
        return col;
      });
      if (!movedCard) return prev;
      return {
        ...prev,
        columns: cols.map(col => {
          if (col.id === targetCol!.id) {
            const newCards = [...col.cards];
            newCards.splice(targetPosition, 0, movedCard!);
            return { ...col, cards: newCards };
          }
          return col;
        }),
      };
    });
  };

  const openComments = (card: Card) => {
    setCommentsCard(card);
  };

  useEffect(() => {
    if (!commentsCard || !board) return;
    for (const col of board.columns) {
      const updated = col.cards.find(c => c.id === commentsCard.id);
      if (updated) {
        setCommentsCard(updated);
        return;
      }
    }
  }, [board]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading board...
      </div>
    );
  }

  if (!board) return null;

  return (
    <div className="page">
      {showAuth && <GuestAuthModal onSubmit={handleAuth} />}

      <header className="header">
        <h1 style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          Retro Board
        </h1>
        <div className="header-actions">
          <span style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>
            {board.title}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={handleExport} id="export-btn">
            Export CSV
          </button>
          {userName && (
            <div className="user-badge">
              <span className="dot" />
              {userName}
            </div>
          )}
        </div>
      </header>

      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        collisionDetection={pointerWithin}
      >
        <div className="board-columns">
          {board.columns.map(col => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onOpenComments={openComments}
            />
          ))}
          <div className="add-column">
            <AddColumnForm onAdd={handleAddColumn} />
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="card" style={{ transform: 'rotate(3deg)', opacity: 0.9 }}>
              <div className="card-content">{activeCard.content}</div>
              <div className="card-meta">
                <span className="card-author">{activeCard.author_name}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {commentsCard && (
        <CommentsPanel
          card={commentsCard}
          onClose={() => setCommentsCard(null)}
          onAddComment={handleAddComment}
        />
      )}
    </div>
  );
}
