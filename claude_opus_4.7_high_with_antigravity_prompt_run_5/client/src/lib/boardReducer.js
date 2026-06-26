/**
 * Pure reducer for board state. Centralizes all mutations so optimistic
 * updates and server broadcasts go through the same code path.
 */
export function boardReducer(state, action) {
  // `set` always wins — it's how we hydrate the board from REST/Socket.io.
  if (action.type === 'set') return action.board;
  // Mutations need an existing board to operate on; otherwise no-op so a
  // late socket event doesn't crash before the initial fetch completes.
  if (!state) return state;
  switch (action.type) {
    case 'card_added': {
      const { card } = action;
      return {
        ...state,
        columns: state.columns.map((col) =>
          col.id === card.column_id
            ? { ...col, cards: [...col.cards, { ...card, comments: [] }] }
            : col,
        ),
      };
    }

    case 'card_moved': {
      const { cardId, fromColumnId, toColumnId, toIndex } = action;
      let moved = null;
      const stripped = state.columns.map((col) => {
        if (col.id !== fromColumnId) return col;
        return {
          ...col,
          cards: col.cards.filter((c) => {
            if (c.id === cardId) { moved = c; return false; }
            return true;
          }),
        };
      });
      if (!moved) return state;
      return {
        ...state,
        columns: stripped.map((col) => {
          if (col.id !== toColumnId) return col;
          const next = [...col.cards];
          const idx = Math.max(0, Math.min(toIndex, next.length));
          next.splice(idx, 0, { ...moved, column_id: toColumnId });
          return { ...col, cards: next };
        }),
      };
    }

    case 'comment_added': {
      const { comment } = action;
      return {
        ...state,
        columns: state.columns.map((col) => ({
          ...col,
          cards: col.cards.map((c) =>
            c.id === comment.card_id
              ? { ...c, comments: [...(c.comments || []), comment] }
              : c,
          ),
        })),
      };
    }

    case 'column_added': {
      const exists = state.columns.some((c) => c.id === action.column.id);
      if (exists) return state;
      return { ...state, columns: [...state.columns, action.column] };
    }

    default:
      return state;
  }
}

export function findCardLocation(state, cardId) {
  for (const col of state.columns) {
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx >= 0) return { columnId: col.id, index: idx };
  }
  return null;
}
