import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import GuestModal from '../components/GuestModal.jsx';
import Board from '../components/Board.jsx';

export default function BoardPage() {
  const { id } = useParams();
  const [board, setBoard] = useState(null);
  const [userName, setUserName] = useState(() => sessionStorage.getItem('retroUserName') || '');
  const [loading, setLoading] = useState(true);

  const fetchBoard = useCallback(() => {
    fetch(`/api/boards/${id}`)
      .then(res => res.json())
      .then(data => {
        setBoard(data);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  function handleSetName(name) {
    sessionStorage.setItem('retroUserName', name);
    setUserName(name);
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  }

  if (!userName) {
    return <GuestModal onSubmit={handleSetName} />;
  }

  return <Board board={board} setBoard={setBoard} userName={userName} />;
}
