import { useReducer, useCallback } from 'react';

function reducer(state, action) {
  switch (action.type) {
    case 'set_board':
      return action.board;

    case 'add_column': {
      if (!state) return state;
      if (state.columns.some((c) => c.id === action.column.id)) return state;
      return {
        ...state,
        columns: [...state.columns, { ...action.column, cards: [] }],
      };
    }

    case 'add_card': {
      if (!state) return state;
      const card = { ...action.card, comments: action.card.comments || [] };
      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col.id !== card.column_id) return col;
          if (col.cards.some((c) => c.id === card.id)) return col;
          const cards = [...col.cards, card].sort(
            (a, b) => a.position - b.position
          );
          return { ...col, cards };
        }),
      };
    }

    case 'move_card': {
      if (!state) return state;
      const { cardId, fromColumnId, toColumnId, newPosition } = action;
      let movedCard = null;
      const columnsWithoutCard = state.columns.map((col) => {
        if (col.id !== fromColumnId) return col;
        const idx = col.cards.findIndex((c) => c.id === cardId);
        if (idx === -1) return col;
        movedCard = col.cards[idx];
        const cards = col.cards.filter((c) => c.id !== cardId).map((c, i) => ({
          ...c,
          position: i,
        }));
        return { ...col, cards };
      });

      if (!movedCard) {
        // Card not found locally — fall back: search all columns
        for (const col of state.columns) {
          const found = col.cards.find((c) => c.id === cardId);
          if (found) {
            movedCard = found;
            break;
          }
        }
        if (!movedCard) return state;
      }

      return {
        ...state,
        columns: columnsWithoutCard.map((col) => {
          if (col.id !== toColumnId) return col;
          const cards = col.cards.filter((c) => c.id !== cardId);
          const pos = Math.max(0, Math.min(newPosition, cards.length));
          cards.splice(pos, 0, { ...movedCard, column_id: toColumnId });
          return {
            ...col,
            cards: cards.map((c, i) => ({ ...c, position: i })),
          };
        }),
      };
    }

    case 'add_comment': {
      if (!state) return state;
      return {
        ...state,
        columns: state.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) => {
            if (card.id !== action.comment.card_id) return card;
            if (card.comments.some((c) => c.id === action.comment.id)) return card;
            return { ...card, comments: [...card.comments, action.comment] };
          }),
        })),
      };
    }

    default:
      return state;
  }
}

export function useBoardState() {
  const [board, dispatch] = useReducer(reducer, null);

  const setBoard = useCallback((b) => dispatch({ type: 'set_board', board: b }), []);
  const addColumn = useCallback((column) => dispatch({ type: 'add_column', column }), []);
  const addCard = useCallback((card) => dispatch({ type: 'add_card', card }), []);
  const moveCard = useCallback(
    (payload) => dispatch({ type: 'move_card', ...payload }),
    []
  );
  const addComment = useCallback(
    (comment) => dispatch({ type: 'add_comment', comment }),
    []
  );

  return { board, setBoard, addColumn, addCard, moveCard, addComment };
}
