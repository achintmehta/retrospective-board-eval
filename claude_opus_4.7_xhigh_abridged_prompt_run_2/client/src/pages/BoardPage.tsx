import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import TopBar from '../components/TopBar';
import GuestAuthModal from '../components/GuestAuthModal';
import BoardColumn from '../components/BoardColumn';
import RetroCard, { RetroCardOverlay } from '../components/RetroCard';
import PresenceBar from '../components/PresenceBar';
import ConnectionPill from '../components/ConnectionPill';
import { AddColumnControl } from '../components/AddColumnControl';
import { useBoardSocket } from '../hooks/useBoardSocket';
import { useDisplayName } from '../hooks/useDisplayName';
import { api } from '../lib/api';
import type { BoardWithChildren, CardRow } from '../types';
import './BoardPage.css';

interface DragMeta {
  cardId: string;
  sourceColumnId: string;
  card: CardRow;
}

function findCardLocation(
  board: BoardWithChildren | null,
  cardId: string
): { columnId: string; card: CardRow } | null {
  if (!board) return null;
  for (const col of board.columns) {
    const card = col.cards.find((c) => c.id === cardId);
    if (card) return { columnId: col.id, card };
  }
  return null;
}

// dnd-kit item ids: "card:<id>" for cards, "col:<id>" for column droppable
const CARD_PREFIX = 'card:';
const COL_PREFIX = 'col:';

function stripPrefix(id: string, prefix: string): string {
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}

export default function BoardPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [displayName, saveDisplayName] = useDisplayName();
  const [notFound, setNotFound] = useState(false);
  const [dragMeta, setDragMeta] = useState<DragMeta | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [creatingColumn, setCreatingColumn] = useState(false);

  const { board, status, error, presence, addCard, moveCard, addComment } = useBoardSocket(
    id,
    displayName
  );

  // Redirect to 404 if the board doesn't exist
  useEffect(() => {
    if (!id) return;
    if (error === 'Board not found') setNotFound(true);
  }, [error, id]);

  useEffect(() => {
    if (notFound) navigate('/404', { replace: true });
  }, [notFound, navigate]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const raw = event.active.id.toString();
    if (!raw.startsWith(CARD_PREFIX)) return;
    const cardId = stripPrefix(raw, CARD_PREFIX);
    const loc = findCardLocation(board, cardId);
    if (loc) setDragMeta({ cardId, sourceColumnId: loc.columnId, card: loc.card });
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // No-op: server is the source of truth. We only commit on drop.
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDragMeta(null);
    if (!over || !board) return;

    const activeRaw = active.id.toString();
    if (!activeRaw.startsWith(CARD_PREFIX)) return;
    const cardId = stripPrefix(activeRaw, CARD_PREFIX);

    const overRaw = over.id.toString();
    let targetColumnId: string;
    let targetIndex: number;

    if (overRaw.startsWith(COL_PREFIX)) {
      targetColumnId = stripPrefix(overRaw, COL_PREFIX);
      const col = board.columns.find((c) => c.id === targetColumnId);
      targetIndex = col ? col.cards.length : 0;
    } else if (overRaw.startsWith(CARD_PREFIX)) {
      const overCardId = stripPrefix(overRaw, CARD_PREFIX);
      const overLoc = findCardLocation(board, overCardId);
      if (!overLoc) return;
      targetColumnId = overLoc.columnId;
      const col = board.columns.find((c) => c.id === targetColumnId)!;
      const overIndex = col.cards.findIndex((c) => c.id === overCardId);

      // If same column and moving downward, treat drop AFTER hovered card
      const sourceLoc = findCardLocation(board, cardId);
      if (sourceLoc && sourceLoc.columnId === targetColumnId) {
        const sourceIndex = col.cards.findIndex((c) => c.id === cardId);
        if (sourceIndex === overIndex) return;
        // arrayMove semantics: place card at overIndex
        const next = arrayMove(col.cards, sourceIndex, overIndex);
        targetIndex = next.findIndex((c) => c.id === cardId);
      } else {
        targetIndex = overIndex;
      }
    } else {
      return;
    }

    const loc = findCardLocation(board, cardId);
    if (!loc) return;

    // Skip no-op moves
    const currentIndex = board.columns
      .find((c) => c.id === loc.columnId)!
      .cards.findIndex((c) => c.id === cardId);
    if (loc.columnId === targetColumnId && currentIndex === targetIndex) return;

    moveCard(cardId, targetColumnId, targetIndex);
  };

  const handleAddColumn = async (title: string) => {
    if (!id) return;
    setCreatingColumn(true);
    try {
      await api.addColumn(id, title);
    } catch {
      /* swallow — no meaningful recovery */
    } finally {
      setCreatingColumn(false);
    }
  };

  const showModal = !displayName;

  if (!id) return null;

  return (
    <div className="app-shell board-shell">
      <TopBar
        center={
          board ? (
            <div className="board-title-crumb">
              <span className="text-tertiary tiny">Board</span>
              <span className="board-title-text">{board.title}</span>
            </div>
          ) : null
        }
        right={
          <div className="flex center gap-3">
            <ConnectionPill status={status} />
            {board && (
              <a
                href={api.exportUrl(board.id)}
                className="btn btn-ghost btn-sm"
                target="_blank"
                rel="noreferrer"
                title="Download this board as CSV"
              >
                <span aria-hidden>⤓</span>
                Export CSV
              </a>
            )}
            {displayName && (
              <span className="chip chip-gradient" title="Your display name">
                <span aria-hidden style={{ fontSize: '0.85em' }}>◆</span>
                {displayName}
              </span>
            )}
          </div>
        }
      />

      <PresenceBar users={presence} />

      <main className="board-main">
        {!board && !error && (
          <div className="board-loading">
            <div className="board-loading-inner">
              <div className="orbiter" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <span className="text-secondary">Waking up your board…</span>
            </div>
          </div>
        )}

        {board && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="columns-scroll">
              <div className="columns-strip">
                {board.columns.map((column, idx) => (
                  <SortableContext
                    key={column.id}
                    id={COL_PREFIX + column.id}
                    items={column.cards.map((c) => CARD_PREFIX + c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <BoardColumn
                      column={column}
                      accentIndex={idx}
                      dragCardId={dragMeta?.cardId ?? null}
                      onAddCard={(content) => addCard(column.id, content)}
                    >
                      {column.cards.map((card) => (
                        <RetroCard
                          key={card.id}
                          card={card}
                          id={CARD_PREFIX + card.id}
                          isDragging={dragMeta?.cardId === card.id}
                          onOpen={() => setOpenCardId(card.id)}
                          onSubmitComment={(content) => addComment(card.id, content)}
                          expanded={openCardId === card.id}
                          onCollapse={() => setOpenCardId(null)}
                          currentUser={displayName ?? 'Guest'}
                        />
                      ))}
                    </BoardColumn>
                  </SortableContext>
                ))}

                <AddColumnControl onAdd={handleAddColumn} busy={creatingColumn} />
              </div>
            </div>

            <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
              {dragMeta ? <RetroCardOverlay card={dragMeta.card} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </main>

      <GuestAuthModal
        open={showModal}
        boardTitle={board?.title}
        onSubmit={(name) => saveDisplayName(name)}
      />
    </div>
  );
}
