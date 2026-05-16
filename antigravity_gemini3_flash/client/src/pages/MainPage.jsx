import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Layout, ArrowRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function MainPage() {
  const [boards, setBoards] = useState([]);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/boards`);
      setBoards(res.data);
    } catch (err) {
      console.error('Failed to fetch boards', err);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async (e) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    try {
      const res = await axios.post(`${API_BASE}/api/boards`, { title: newBoardTitle });
      navigate(`/board/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create board', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-extrabold mb-4 gradient-text">
            Antigravity Retro
          </h1>
          <p className="text-slate-400 text-lg">
            A real-time, self-hosted retrospective board for modern teams.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 glass-morphism">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-indigo-400" /> Create New Board
            </h2>
            <form onSubmit={createBoard} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Board Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sprint 24 Retro"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl flex items-center justify-center gap-2"
              >
                Launch Board <ArrowRight size={18} />
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-300">
            <Layout className="text-indigo-400" /> Existing Boards
          </h2>
          {loading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-800 rounded"></div>
                  <div className="h-4 bg-slate-800 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-slate-500">
              No boards found. Create your first one to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {boards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => navigate(`/board/${board.id}`)}
                  className="group bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/50 cursor-pointer transition-all card-hover"
                >
                  <h3 className="font-bold text-lg mb-2 group-hover:text-indigo-400 transition-colors">
                    {board.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Created {new Date(board.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
