export function boardReducer(state, action) {
  switch (action.type) {
    case 'set':
      return action.board;
    case 'card_added': {
      if (!state) return state;
      const { card } = action;
      const columns = state.columns.map((col) => {
        if (col.id !== card.column_id) return col;
        if (col.cards.some((c) => c.id === card.id)) return col;
        return { ...col, cards: [...col.cards, { ...card, comments: card.comments ?? [] }] };
      });
      return { ...state, columns };
    }
    case 'card_moved': {
      if (!state) return state;
      const { cardId, fromColumnId, toColumnId, toIndex } = action;
      let moving;
      const intermediate = state.columns.map((col) => {
        if (col.id !== fromColumnId) return col;
        const next = [];
        col.cards.forEach((c) => {
          if (c.id === cardId) {
            moving = c;
          } else {
            next.push(c);
          }
        });
        return { ...col, cards: next };
      });
      if (!moving) return state;
      const finalColumns = intermediate.map((col) => {
        if (col.id !== toColumnId) return col;
        const next = [...col.cards];
        const insertAt = Math.max(0, Math.min(toIndex ?? next.length, next.length));
        next.splice(insertAt, 0, { ...moving, column_id: toColumnId });
        return { ...col, cards: next };
      });
      return { ...state, columns: finalColumns };
    }
    case 'comment_added': {
      if (!state) return state;
      const { cardId, comment } = action;
      const columns = state.columns.map((col) => {
        let touched = false;
        const cards = col.cards.map((card) => {
          if (card.id !== cardId) return card;
          if (card.comments?.some((c) => c.id === comment.id)) return card;
          touched = true;
          return { ...card, comments: [...(card.comments ?? []), comment] };
        });
        return touched ? { ...col, cards } : col;
      });
      return { ...state, columns };
    }
    case 'column_added': {
      if (!state) return state;
      const { column } = action;
      if (state.columns.some((c) => c.id === column.id)) return state;
      const columns = [...state.columns, { ...column, cards: [] }].sort(
        (a, b) => a.position - b.position
      );
      return { ...state, columns };
    }
    default:
      return state;
  }
}
