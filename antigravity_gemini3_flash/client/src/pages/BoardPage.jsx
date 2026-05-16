import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Download, Plus, MessageSquare, Layout, X, Send } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';
const socket = io(API_BASE);

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState(localStorage.getItem('retro_display_name') || '');
  const [showAuth, setShowAuth] = useState(!localStorage.getItem('retro_display_name'));
  const [activeCard, setActiveCard] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [newCardText, setNewCardText] = useState({});

  useEffect(() => {
    fetchBoard();
    socket.emit('join_board', id);

    socket.on('card_added', ({ columnId, card }) => {
      setBoard(prev => {
        const newColumns = prev.columns.map(col => {
          if (col.id === columnId) {
            return { ...col, cards: [...(col.cards || []), card] };
          }
          return col;
        });
        return { ...prev, columns: newColumns };
      });
    });

    socket.on('card_moved', ({ cardId, newColumnId, newPosition }) => {
      setBoard(prev => {
        let movedCard = null;
        const updatedColumns = prev.columns.map(col => {
          const cardIndex = col.cards?.findIndex(c => c.id === cardId);
          if (cardIndex !== -1) {
            movedCard = col.cards[cardIndex];
            const newCards = [...col.cards];
            newCards.splice(cardIndex, 1);
            return { ...col, cards: newCards };
          }
          return col;
        });
        if (!movedCard) return prev;
        return {
          ...prev,
          columns: updatedColumns.map(col => {
            if (col.id === newColumnId) {
              const newCards = [...(col.cards || [])];
              newCards.splice(newPosition, 0, { ...movedCard, column_id: newColumnId, position: newPosition });
              return { ...col, cards: newCards };
            }
            return col;
          })
        };
      });
    });

    socket.on('comment_added', ({ cardId, comment }) => {
      setBoard(prev => {
        const newColumns = prev.columns.map(col => {
          const newCards = col.cards?.map(card => {
            if (card.id === cardId) {
              return { ...card, comments: [...(card.comments || []), comment] };
            }
            return card;
          });
          return { ...col, cards: newCards };
        });
        return { ...prev, columns: newColumns };
      });
      setActiveCard(prev => {
        if (prev?.id === cardId) {
          return { ...prev, comments: [...(prev.comments || []), comment] };
        }
        return prev;
      });
    });

    return () => {
      socket.off('card_added');
      socket.off('card_moved');
      socket.off('comment_added');
    };
  }, [id]);

  const fetchBoard = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/boards/${id}`);
      setBoard(res.data);
    } catch (err) {
      console.error('Failed to fetch board', err);
      if (err.response?.status === 404) navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    localStorage.setItem('retro_display_name', displayName);
    setShowAuth(false);
  };

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    socket.emit('move_card', {
      boardId: id,
      cardId: draggableId,
      newColumnId: destination.droppableId,
      newPosition: destination.index
    });
  };

  const addCard = (columnId) => {
    const content = newCardText[columnId];
    if (!content?.trim()) return;
    socket.emit('add_card', {
      boardId: id,
      columnId,
      content,
      authorName: displayName,
      position: board.columns.find(c => c.id === columnId).cards?.length || 0
    });
    setNewCardText(prev => ({ ...prev, [columnId]: '' }));
  };

  const addComment = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeCard) return;
    socket.emit('add_comment', {
      boardId: id,
      cardId: activeCard.id,
      content: commentText,
      authorName: displayName
    });
    setCommentText('');
  };

  const handleExport = async () => {
    window.location.href = `${API_BASE}/api/boards/${id}/export`;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {showAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-2">Welcome to the Board</h2>
            <p className="text-slate-400 mb-6 text-sm">Please enter your display name to join the session.</p>
            <form onSubmit={handleAuth} className="space-y-4">
              <input
                autoFocus
                type="text"
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-slate-950 text-lg py-3"
              />
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold">
                Join Session
              </button>
            </form>
          </div>
        </div>
      )}

      {activeCard && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">{activeCard.author_name}</p>
                <h3 className="text-xl font-bold">{activeCard.content}</h3>
              </div>
              <button onClick={() => setActiveCard(null)} className="text-slate-500 hover:text-white p-1">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-400 mb-4 flex items-center gap-2">
                  <MessageSquare size={16} /> Comments ({activeCard.comments?.length || 0})
                </h4>
                <div className="space-y-4">
                  {activeCard.comments?.map(comment => (
                    <div key={comment.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-300">{comment.author_name}</span>
                        <span className="text-[10px] text-slate-500">{new Date(comment.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-slate-300">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800">
              <form onSubmit={addComment} className="relative">
                <input
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="pr-12 bg-slate-950 border-slate-800"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-400 p-2">
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0 glass-morphism">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <Layout size={20} />
          </button>
          <div className="h-6 w-[1px] bg-slate-800 mx-2"></div>
          <h1 className="text-lg font-bold truncate max-w-xs">{board?.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </header>

      <DragDropContext onDragEnd={onDragEnd}>
        <main className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-950 p-6 flex gap-6">
          {board?.columns.map(column => (
            <div key={column.id} className="w-85 shrink-0 flex flex-col h-full bg-slate-900/40 rounded-2xl border border-slate-800/50">
              <div className="p-4 flex items-center justify-between border-b border-slate-800/50">
                <h2 className="font-bold text-slate-300 flex items-center gap-2">
                  {column.title}
                  <span className="bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded-full">
                    {column.cards?.length || 0}
                  </span>
                </h2>
              </div>
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                    {column.cards?.map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setActiveCard(card)} className="bg-slate-800 border border-slate-700/50 p-4 rounded-xl shadow-sm hover:border-indigo-500/50 transition-all cursor-pointer group card-hover">
                            <p className="text-sm text-slate-200 mb-3">{card.content}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.author_name}</span>
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <MessageSquare size={12} />
                                <span className="text-[10px]">{card.comments?.length || 0}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    <div className="mt-4 pt-4 border-t border-slate-800/50">
                      <div className="relative">
                        <textarea
                          placeholder="Type something..."
                          value={newCardText[column.id] || ''}
                          onChange={(e) => setNewCardText(prev => ({ ...prev, [column.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(column.id); } }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm min-h-[80px] focus:border-indigo-500 outline-none resize-none"
                        />
                        <button onClick={() => addCard(column.id)} className="absolute bottom-2 right-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
          <button className="w-85 shrink-0 flex items-center justify-center gap-2 bg-slate-900/10 hover:bg-slate-900/20 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl text-slate-500 transition-all h-14 font-medium">
            <Plus size={18} /> Add Another Column
          </button>
        </main>
      </DragDropContext>
    </div>
  );
}
