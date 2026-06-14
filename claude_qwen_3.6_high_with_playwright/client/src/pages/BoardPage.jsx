import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || '/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [displayName, setDisplayName] = useState(() => {
    const saved = localStorage.getItem('displayName');
    if (saved && saved.trim().length < 2) {
      localStorage.removeItem('displayName');
      return '';
    }
    return saved || '';
  });
  const [nameInput, setNameInput] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [draggedCard, setDraggedCard] = useState(null);
  const [openComments, setOpenComments] = useState({});
  const socketRef = useRef(null);

  // Fetch board data
  const fetchBoard = async () => {
    const res = await fetch(`${API}/boards/${id}`);
    const data = await res.json();
    setBoard(data);
    setColumns(data.columns || []);
  };

  useEffect(() => { fetchBoard(); }, [id]);

  // Socket connection
  useEffect(() => {
    if (!displayName) return;
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.emit('join_board', id);

    socket.on('card_added', (card) => {
      setColumns(prev => prev.map(col =>
        col.id === card.column_id
          ? { ...col, cards: [...col.cards, { ...card, comments: card.comments || [] }] }
          : col
      ));
    });

    socket.on('card_moved', (card) => {
      setColumns(prev => {
        let found = null;
        const filtered = prev.flatMap(col => {
          const cards = col.cards.filter(c => c.id !== card.id);
          const match = col.cards.find(c => c.id === card.id);
          if (match) found = match;
          return [{ ...col, cards }];
        });
        if (found) {
          filtered.forEach(col => {
            if (col.id === card.column_id) {
              col.cards.splice(card.position, 0, { ...found, position: card.position });
            }
          });
        }
        return filtered;
      });
    });

    socket.on('comment_added', (comment) => {
      setColumns(prev => prev.map(col => ({
        ...col,
        cards: col.cards.map(card =>
          card.id === comment.card_id
            ? { ...card, comments: [...(card.comments || []), comment] }
            : card
        )
      })));
    });

    socket.on('connect', () => { fetchBoard(); });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, displayName]);

  if (!displayName) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h2>Join This Board</h2>
          <p>Enter your display name to continue</p>
          <input
            type="text"
            placeholder="Your name..."
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && nameInput.trim()) {
                localStorage.setItem('displayName', nameInput.trim());
                setDisplayName(nameInput.trim());
              }
            }}
            autoFocus
          />
        </div>
      </div>
    );
  }

  const addCard = async (columnId, content) => {
    if (!content.trim()) return;
    const col = columns.find(c => c.id === columnId);
    const position = col ? col.cards.length : 0;
    socketRef.current.emit('add_card', { boardId: id, columnId, content: content.trim(), authorName: displayName, position });
  };

  const addComment = async (cardId, content) => {
    if (!content.trim()) return;
    socketRef.current.emit('add_comment', { boardId: id, cardId, content: content.trim(), authorName: displayName });
  };

  const handleDragStart = (e, cardId) => {
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, targetColumnId, targetIndex) => {
    e.preventDefault();
    if (!draggedCard) return;
    const card = findCard(draggedCard);
    if (card) {
      socketRef.current.emit('move_card', { boardId: id, cardId: draggedCard, columnId: targetColumnId, position: targetIndex });
    }
    setDraggedCard(null);
  };

  const findCard = (cardId) => {
    for (const col of columns) {
      const card = col.cards.find(c => c.id === cardId);
      if (card) return card;
    }
    return null;
  };

  const addColumn = async (e) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;
    const res = await fetch(`${API}/boards/${id}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newColumnTitle.trim() })
    });
    const col = await res.json();
    setColumns(prev => [...prev, { ...col, cards: [] }]);
    setNewColumnTitle('');
  };

  const handleExport = () => {
    window.open(`${API}/boards/${id}/export`, '_blank');
  };

  const toggleComments = (cardId) => {
    setOpenComments(prev => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  return (
    <div className="board-page">
      <div className="board-header">
        <div>
          <a href="/">← Back</a>
          <h2 style={{ display: 'inline', marginLeft: '0.5rem' }}>{board?.title}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>{displayName}</span>
          <button className="btn btn-sm export-btn" onClick={handleExport}>Export CSV</button>
        </div>
      </div>

      <form className="add-column-form" onSubmit={addColumn}>
        <input
          value={newColumnTitle}
          onChange={e => setNewColumnTitle(e.target.value)}
          placeholder="Add column title..."
        />
        <button className="btn btn-sm" type="submit">Add Column</button>
      </form>

      <div className="board-columns">
        {columns.map(col => (
          <Column
            key={col.id}
            column={col}
            onAddCard={addCard}
            onAddComment={addComment}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            draggedCard={draggedCard}
            openComments={openComments}
            toggleComments={toggleComments}
          />
        ))}
      </div>
    </div>
  );
}

function Column({ column, onAddCard, onAddComment, onDragStart, onDrop, draggedCard, openComments, toggleComments }) {
  const [cardText, setCardText] = useState('');
  const [commentTexts, setCommentTexts] = useState({});
  const [over, setOver] = useState(false);

  const handleSubmitCard = (e) => {
    e.preventDefault();
    if (!cardText.trim()) return;
    onAddCard(column.id, cardText);
    setCardText('');
  };

  const handleSubmitComment = (cardId) => {
    const text = commentTexts[cardId] || '';
    if (!text.trim()) return;
    onAddComment(cardId, text);
    setCommentTexts(prev => ({ ...prev, [cardId]: '' }));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setOver(true);
  };

  const handleDragLeave = () => setOver(false);

  const handleDropOnColumn = (e) => {
    e.preventDefault();
    setOver(false);
    onDrop(e, column.id, column.cards.length);
  };

  return (
    <div
      className="column"
      style={over ? { background: '#cdd1d5' } : {}}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropOnColumn}
    >
      <h3>{column.title}</h3>

      {column.cards.map((card, idx) => (
        <div
          key={card.id}
          className={`card${draggedCard === card.id ? ' dragging' : ''}`}
          draggable
          onDragStart={e => onDragStart(e, card.id)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            onDrop(e, column.id, idx);
          }}
        >
          <div className="card-content">{card.content}</div>
          <div className="card-meta">by {card.author_name}</div>
          <button className="card-toggle-comments" onClick={() => toggleComments(card.id)}>
            {openComments[card.id] ? 'Hide' : 'Show'} Comments ({card.comments?.length || 0})
          </button>
          {openComments[card.id] && (
            <div className="comments-section">
              {(card.comments || []).map(c => (
                <div key={c.id} className="comment">
                  <span className="comment-author">{c.author_name}:</span> {c.content}
                </div>
              ))}
              <form className="add-comment-form" onSubmit={e => { e.preventDefault(); handleSubmitComment(card.id); }}>
                <input
                  value={commentTexts[card.id] || ''}
                  onChange={e => setCommentTexts(prev => ({ ...prev, [card.id]: e.target.value }))}
                  placeholder="Reply..."
                />
                <button className="btn btn-sm" type="submit">Send</button>
              </form>
            </div>
          )}
        </div>
      ))}

      <form className="add-card-form" onSubmit={handleSubmitCard}>
        <input
          value={cardText}
          onChange={e => setCardText(e.target.value)}
          placeholder="Add a card..."
        />
        <button className="btn btn-sm" type="submit">Add</button>
      </form>
    </div>
  );
}

export default BoardPage;
