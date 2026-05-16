import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

interface Board {
  id: string;
  title: string;
  createdAt: string;
  columns: Column[];
}

interface Column {
  id: string;
  boardId: string;
  title: string;
  position: number;
  cards?: Card[];
}

interface Card {
  id: string;
  columnId: string;
  content: string;
  authorName: string;
  createdAt: string;
  position: number;
}

function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [board, setBoard] = useState<Board | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Connect to socket
    const newSocket = io('http://localhost:3000');

    // Listen for card_added events from the server
    newSocket.on('card_added', (data) => {
      setBoard((prevBoard) => {
        if (!prevBoard) return null;

        // Add the new card to the correct column
        const updatedColumns = prevBoard.columns.map((col) => {
          if (col.id === data.card.columnId) {
            return { ...col, cards: [...(col.cards || []), data.card] };
          }
          return col;
        });

        return { ...prevBoard, columns: updatedColumns };
      });
    });

    // Listen for card_moved events from the server
    newSocket.on('card_moved', (data) => {
      setBoard((prevBoard) => {
        if (!prevBoard) return null;

        // Remove card from old column and add to new column
        const updatedColumns = prevBoard.columns.map((col) => {
          if (col.id === data.toColumnId) {
            return { ...col, cards: [...(col.cards || [])] };
          }
          return col;
        });

        return { ...prevBoard, columns: updatedColumns };
      });
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchBoard = async () => {
      try {
        const response = await fetch(`/api/boards/${id}`);
        const data = await response.json();

        if (response.ok) {
          setBoard(data);
          // Join the room
          socket?.emit('join_board', id);
          setError(null);
        } else {
          setError('Failed to load board');
          navigate('/');
        }
      } catch (err) {
        setError('Failed to load board. Make sure the server is running.');
      }
    };

    fetchBoard();
  }, [id, socket, navigate]);

  const handleAddColumn = async () => {
    const title = prompt('Enter column title:');
    if (!title) return;

    try {
      await fetch(`/api/boards/${id}/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      // Refresh board data
      const response = await fetch(`/api/boards/${id}`);
      const data = await response.json();
      setBoard(data);
    } catch (err) {
      setError('Failed to add column');
    }
  };

  if (!board) {
    return (
      <div style={styles.container}>
        <p>Loading board...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>{board.title}</h1>

      {error && <p style={styles.error}>{error}</p>}

      <button onClick={handleAddColumn} style={styles.addColumnBtn}>
        Add Column
      </button>

      <div style={styles.columnsContainer}>
        {board.columns.map((column) => (
          <ColumnView
            key={column.id}
            column={column}
            boardId={board.id}
            socket={socket}
          />
        ))}
      </div>
    </div>
  );
}

interface ColumnViewProps {
  column: Column;
  boardId: string;
  socket: Socket | null;
}

function ColumnView({ column, boardId, socket }: ColumnViewProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [newCardContent, setNewCardContent] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  useEffect(() => {
    // Fetch cards for this column from the board data
    if (column.cards) {
      setCards(column.cards);
    }
  }, [column]);

  const handleAddCard = async () => {
    if (!newCardContent.trim()) return;

    try {
      socket?.emit('add_card', { boardId, columnId: column.id, content: newCardContent });
      setNewCardContent('');
      setIsAddingCard(false);
    } catch (err) {
      console.error('Failed to add card:', err);
    }
  };

  const handleCardAdded = (newCard: Card) => {
    setCards((prev) => [...prev, newCard]);
  };

  return (
    <div style={styles.column}>
      <h3>{column.title}</h3>
      <div style={styles.cardsContainer}>
        {cards.map((card) => (
          <CardView key={card.id} card={card} boardId={boardId} socket={socket} />
        ))}
      </div>

      {isAddingCard ? (
        <div style={styles.addCardForm}>
          <textarea
            value={newCardContent}
            onChange={(e) => setNewCardContent(e.target.value)}
            placeholder="Enter card content..."
            rows={3}
            style={styles.textarea}
          />
          <div style={styles.buttonGroup}>
            <button onClick={handleAddCard} style={styles.saveBtn}>
              Add Card
            </button>
            <button onClick={() => setIsAddingCard(false)} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setIsAddingCard(true)} style={styles.addCardBtn}>
          + Add Card
        </button>
      )}
    </div>
  );
}

interface CardViewProps {
  card: Card;
  boardId: string;
  socket: Socket | null;
}

function CardView({ card, boardId, socket }: CardViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(card.content);

  useEffect(() => {
    setContent(card.content);
  }, [card.content]);

  const handleUpdateContent = async () => {
    if (content !== card.content) {
      // TODO: Implement update card
    }
    setIsEditing(false);
  };

  return (
    <div style={styles.card}>
      {isEditing ? (
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            style={styles.textarea}
          />
          <button onClick={handleUpdateContent} style={styles.saveBtn}>
            Save
          </button>
        </div>
      ) : (
        <>
          <p style={styles.cardContent}>{card.content}</p>
          <small style={styles.cardMeta}>
            By {card.authorName} on {new Date(card.createdAt).toLocaleDateString()}
          </small>
          {/* TODO: Add comment button and comments */}
        </>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  addColumnBtn: {
    padding: '10px 20px',
    marginBottom: '20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  columnsContainer: {
    display: 'flex',
    gap: '20px',
    overflowX: 'auto',
    paddingBottom: '20px',
  },
  column: {
    minWidth: '300px',
    backgroundColor: '#e9ecef',
    borderRadius: '8px',
    padding: '15px',
    flexShrink: 0,
  },
  cardsContainer: {
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingBottom: '10px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '4px',
    padding: '10px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  },
  cardContent: {
    margin: '0 0 5px 0',
    whiteSpace: 'pre-wrap',
  },
  cardMeta: {
    color: '#666',
    fontSize: '11px',
  },
  addCardBtn: {
    width: '100%',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginTop: '10px',
  },
  addCardForm: {
    backgroundColor: '#fff',
    padding: '10px',
    borderRadius: '4px',
    marginTop: '10px',
  },
  textarea: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    resize: 'vertical',
    marginBottom: '10px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
  },
  saveBtn: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '6px 12px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default BoardPage;
