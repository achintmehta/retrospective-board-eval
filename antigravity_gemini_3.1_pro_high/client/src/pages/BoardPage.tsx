import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import GuestAuthModal from '../components/GuestAuthModal';

let socket: Socket;

export default function BoardPage() {
  const { id } = useParams();
  const [boardData, setBoardData] = useState<any>(null);
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('displayName') || '');
  const [showAuth, setShowAuth] = useState(!localStorage.getItem('displayName'));
  const [newCardContent, setNewCardContent] = useState<Record<string, string>>({});
  const [newCommentContent, setNewCommentContent] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/boards/${id}`)
      .then(r => r.json())
      .then(data => setBoardData(data));
      
    socket = io();
    socket.emit('join_board', id);

    socket.on('card_added', (card) => {
      setBoardData((prev: any) => ({
        ...prev,
        cards: [...prev.cards, card]
      }));
    });

    socket.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoardData((prev: any) => {
        const cards = prev.cards.map((c: any) => 
          c.id === cardId ? { ...c, column_id: newColumnId, position: newPosition } : c
        );
        return { ...prev, cards };
      });
    });

    socket.on('comment_added', (comment) => {
      setBoardData((prev: any) => ({
        ...prev,
        comments: [...prev.comments, comment]
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  const handleSetDisplayName = (name: string) => {
    localStorage.setItem('displayName', name);
    setDisplayName(name);
    setShowAuth(false);
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    setBoardData((prev: any) => {
      const cards = [...prev.cards];
      const cardIndex = cards.findIndex(c => c.id === draggableId);
      if (cardIndex > -1) {
        cards[cardIndex] = { ...cards[cardIndex], column_id: destination.droppableId, position: destination.index };
      }
      return { ...prev, cards };
    });

    socket.emit('move_card', {
      boardId: id,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index
    });
  };

  const addCard = (columnId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = newCardContent[columnId];
    if (!content) return;

    socket.emit('add_card', {
      boardId: id,
      columnId,
      content,
      authorName: displayName,
      position: boardData.cards.filter((c:any) => c.column_id === columnId).length
    });
    setNewCardContent(prev => ({ ...prev, [columnId]: '' }));
  };

  const addComment = (cardId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = newCommentContent[cardId];
    if (!content) return;

    socket.emit('add_comment', {
      boardId: id,
      cardId,
      content,
      authorName: displayName
    });
    setNewCommentContent(prev => ({ ...prev, [cardId]: '' }));
  };

  if (showAuth) {
    return <GuestAuthModal onSet={handleSetDisplayName} />;
  }

  if (!boardData) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{boardData.board.title}</h1>
          <p>Welcome, {displayName}</p>
        </div>
        <button onClick={() => window.open(`/api/boards/${id}/export`, '_blank')} style={{ padding: '0.5rem 1rem' }}>
          Export to CSV
        </button>
      </div>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', overflowX: 'auto', alignItems: 'flex-start' }}>
          {boardData.columns.map((col: any) => (
            <div key={col.id} style={{ background: '#f4f4f4', padding: '1rem', width: '320px', borderRadius: '8px', flexShrink: 0 }}>
              <h3>{col.title}</h3>
              
              <Droppable droppableId={col.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {boardData.cards
                      .filter((c: any) => c.column_id === col.id)
                      .sort((a: any, b: any) => a.position - b.position)
                      .map((card: any, index: number) => (
                        <Draggable key={card.id} draggableId={card.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                background: 'white',
                                padding: '1rem',
                                borderRadius: '4px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                ...provided.draggableProps.style
                              }}
                            >
                              <p style={{ margin: '0 0 0.5rem 0' }}>{card.content}</p>
                              <small style={{ color: 'gray' }}>By {card.author_name}</small>

                              <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                                {boardData.comments.filter((c: any) => c.card_id === card.id).map((comment: any) => (
                                  <div key={comment.id} style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                    <strong>{comment.author_name}:</strong> {comment.content}
                                  </div>
                                ))}
                                <form onSubmit={(e) => addComment(card.id, e)} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                  <input
                                    value={newCommentContent[card.id] || ''}
                                    onChange={e => setNewCommentContent(prev => ({...prev, [card.id]: e.target.value}))}
                                    placeholder="Add comment..."
                                    style={{ flex: 1, padding: '0.3rem', fontSize: '0.9rem' }}
                                  />
                                  <button type="submit">Post</button>
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

              <form onSubmit={(e) => addCard(col.id, e)} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <input
                  value={newCardContent[col.id] || ''}
                  onChange={e => setNewCardContent(prev => ({...prev, [col.id]: e.target.value}))}
                  placeholder="New card..."
                  style={{ flex: 1, padding: '0.5rem' }}
                />
                <button type="submit">Add</button>
              </form>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
