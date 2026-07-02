import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisplayName } from '../hooks/useDisplayName.js';
import { useBoardSocket } from '../hooks/useBoardSocket.js';
import { api } from '../api.js';
import GuestAuthModal from '../components/GuestAuthModal.jsx';
import Column from '../components/Column.jsx';
import AddColumnForm from '../components/AddColumnForm.jsx';
import CardModal from '../components/CardModal.jsx';

export default function BoardPage() {
  const { boardId } = useParams();
  const { name, setName } = useDisplayName();
  const { state, connected, addCard, moveCard, addComment, addColumnLocal } = useBoardSocket(
    boardId,
    name
  );
  const [addingColumn, setAddingColumn] = useState(false);
  const [openCardId, setOpenCardId] = useState(null);
  const [actionError, setActionError] = useState(null);

  useEffect(() => {
    if (!actionError) return undefined;
    const t = setTimeout(() => setActionError(null), 3500);
    return () => clearTimeout(t);
  }, [actionError]);

  const board = state.board;

  async function handleAddCard(columnId, content) {
    try {
      await addCard(columnId, content);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleAddComment(cardId, content) {
    try {
      await addComment(cardId, content);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleAddColumn(title) {
    try {
      const res = await api.createColumn(boardId, title);
      addColumnLocal(res.column);
      setAddingColumn(false);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function onDragEnd(result) {
    if (!result.destination) return;
    const { draggableId, destination, source } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
    try {
      await moveCard(draggableId, destination.droppableId, destination.index);
    } catch (err) {
      setActionError(err.message);
    }
  }

  const openCard = openCardId && board ? findCard(board, openCardId) : null;

  if (!name) {
    return (
      <GuestAuthModal
        open
        onSubmit={(n) => setName(n)}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <div className="board-page__error">
        <h2>Couldn't load board</h2>
        <p>{state.error}</p>
        <Link to="/" className="btn btn--secondary">← Back to boards</Link>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="board-page__loading">
        <div className="spinner" />
        <p>Connecting…</p>
      </div>
    );
  }

  return (
    <div className="board-page">
      <div className="board-toolbar">
        <div className="board-toolbar__left">
          <Link to="/" className="board-toolbar__back" aria-label="Back to boards">
            ←
          </Link>
          <div>
            <h1 className="board-toolbar__title">{board.title}</h1>
            <div className="board-toolbar__meta">
              <span className={`dot ${connected ? 'dot--on' : 'dot--off'}`} />
              {connected ? 'live' : 'reconnecting…'} · {state.presence || 1}{' '}
              {state.presence === 1 ? 'person' : 'people'} present
              <span className="board-toolbar__sep">·</span>
              signed in as <strong>{name}</strong>
            </div>
          </div>
        </div>
        <div className="board-toolbar__right">
          <a
            className="btn btn--secondary"
            href={api.exportUrl(board.id)}
            download
          >
            ⤓ Export CSV
          </a>
        </div>
      </div>

      <AnimatePresence>
        {actionError && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="alert alert--error alert--floating"
          >
            ⚠ {actionError}
          </motion.div>
        )}
      </AnimatePresence>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="board-columns">
          {board.columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              onAddCard={handleAddCard}
              onOpenCard={setOpenCardId}
            />
          ))}
          <div className="column column--ghost">
            {addingColumn ? (
              <AddColumnForm
                onSubmit={handleAddColumn}
                onCancel={() => setAddingColumn(false)}
              />
            ) : (
              <button
                type="button"
                className="column__add"
                onClick={() => setAddingColumn(true)}
              >
                + Add column
              </button>
            )}
          </div>
        </div>
      </DragDropContext>

      <CardModal
        card={openCard}
        onClose={() => setOpenCardId(null)}
        onAddComment={handleAddComment}
        currentUser={name}
      />
    </div>
  );
}

function findCard(board, cardId) {
  for (const col of board.columns) {
    const found = col.cards.find((c) => c.id === cardId);
    if (found) return { ...found, columnTitle: col.title };
  }
  return null;
}
