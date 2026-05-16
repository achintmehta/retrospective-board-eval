import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

let socket: Socket;

export default function Board() {
  const { id } = useParams();
  const [board, setBoard] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  
  const [displayName, setDisplayName] = useState(localStorage.getItem('retro_name') || '');
  const [isJoined, setIsJoined] = useState(!!localStorage.getItem('retro_name'));
  
  const [newCardContent, setNewCardContent] = useState<Record<string, string>>({});
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isJoined) return;
    
    fetch(`/api/boards/${id}`)
      .then(r => r.json())
      .then(data => {
        setBoard(data);
        setColumns(data.columns);
        setCards(data.cards);
        setComments(data.comments);
      });

    socket = io();
    socket.emit('join_board', id);

    socket.on('card_added', (card) => {
      setCards(prev => [...prev, card]);
    });

    socket.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setCards(prev => prev.map(c => 
        c.id === cardId ? { ...c, column_id: newColumnId, position: newPosition } : c
      ));
    });

    socket.on('comment_added', (comment) => {
      setComments(prev => [...prev, comment]);
    });

    return () => {
      socket.disconnect();
    };
  }, [id, isJoined]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName.trim()) {
      localStorage.setItem('retro_name', displayName.trim());
      setIsJoined(true);
    }
  };

  const handleAddCard = (columnId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = newCardContent[columnId];
    if (!content?.trim()) return;
    
    const position = cards.filter(c => c.column_id === columnId).length;
    socket.emit('add_card', { boardId: id, columnId, content, authorName: displayName, position });
    setNewCardContent(prev => ({ ...prev, [columnId]: '' }));
  };

  const handleAddComment = (cardId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = newCommentContent[cardId];
    if (!content?.trim()) return;

    socket.emit('add_comment', { boardId: id, cardId, content, authorName: displayName });
    setNewCommentContent(prev => ({ ...prev, [cardId]: '' }));
  };

  const onDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newColumnId = destination.droppableId;
    const newPosition = destination.index;

    // Optimistic UI update
    setCards(prev => {
      const updated = prev.map(c => c.id === draggableId ? { ...c, column_id: newColumnId, position: newPosition } : c);
      return updated;
    });

    socket.emit('move_card', { boardId: id, cardId: draggableId, newColumnId, newPosition });
  };

  if (!isJoined) {
    return (
      <div className="container" style={{ maxWidth: '400px', marginTop: '100px' }}>
        <div className="card">
          <h2>Join Board</h2>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your Display Name"
              required
            />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>
    );
  }

  if (!board) return <div className="container">Loading...</div>;

  return (
    <div style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>{board.title}</h1>
        <div>
          <span style={{ marginRight: '1rem' }}>User: {displayName}</span>
          <a href={`/api/boards/${id}/export`} target="_blank" rel="noreferrer">
            <button>Export to CSV</button>
          </a>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, overflowX: 'auto', alignItems: 'flex-start' }}>
          {columns.map(col => (
            <div key={col.id} className="card" style={{ minWidth: '300px', background: '#f9fafb' }}>
              <h3 style={{ marginTop: 0 }}>{col.title}</h3>
              
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div 
                    ref={provided.innerRef} 
                    {...provided.droppableProps}
                    style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}
                  >
                    {cards.filter(c => c.column_id === col.id).sort((a,b) => a.position - b.position).map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              background: 'white',
                              padding: '1rem',
                              borderRadius: '0.375rem',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              border: '1px solid var(--border)',
                              ...provided.draggableProps.style
                            }}
                          >
                            <p style={{ margin: '0 0 0.5rem 0' }}>{card.content}</p>
                            <small style={{ color: 'var(--text-muted)' }}>- {card.author_name}</small>
                            
                            <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                              {comments.filter(c => c.card_id === card.id).map(comment => (
                                <div key={comment.id} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                                  <strong>{comment.author_name}: </strong>{comment.content}
                                </div>
                              ))}
                              
                              <form onSubmit={(e) => handleAddComment(card.id, e)} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <input 
                                  value={newCommentContent[card.id] || ''}
                                  onChange={e => setNewCommentContent(prev => ({ ...prev, [card.id]: e.target.value }))}
                                  placeholder="Add a comment..."
                                  style={{ flex: 1, padding: '0.25rem', fontSize: '0.875rem' }}
                                />
                                <button type="submit" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>Post</button>
                              </form>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <form onSubmit={(e) => handleAddCard(col.id, e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input 
                  value={newCardContent[col.id] || ''}
                  onChange={e => setNewCardContent(prev => ({ ...prev, [col.id]: e.target.value }))}
                  placeholder="Add a card..."
                />
                <button type="submit">Add Card</button>
              </form>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
