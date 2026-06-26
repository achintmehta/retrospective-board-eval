function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toRow(cells) {
  return cells.map(escapeCell).join(',');
}

function isoFromMs(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toISOString();
  } catch {
    return '';
  }
}

export function buildBoardCsv(board) {
  const lines = [];
  lines.push(toRow(['Board', 'Column', 'Type', 'Author', 'Content', 'Parent Card', 'Created At']));

  const columnsById = new Map(board.columns.map((c) => [c.id, c]));
  const cardsById = new Map(board.cards.map((c) => [c.id, c]));
  const commentsByCard = new Map();
  for (const comment of board.comments) {
    if (!commentsByCard.has(comment.card_id)) commentsByCard.set(comment.card_id, []);
    commentsByCard.get(comment.card_id).push(comment);
  }

  // Cards in column order, then comments under each card
  const sortedColumns = [...board.columns].sort((a, b) => a.position - b.position);
  for (const column of sortedColumns) {
    const cardsInColumn = board.cards
      .filter((c) => c.column_id === column.id)
      .sort((a, b) => a.position - b.position);

    for (const card of cardsInColumn) {
      lines.push(
        toRow([
          board.title,
          column.title,
          'card',
          card.author_name,
          card.content,
          '',
          isoFromMs(card.created_at),
        ])
      );

      const comments = commentsByCard.get(card.id) || [];
      for (const comment of comments) {
        lines.push(
          toRow([
            board.title,
            column.title,
            'comment',
            comment.author_name,
            comment.content,
            card.content,
            isoFromMs(comment.created_at),
          ])
        );
      }
    }
  }

  // Reference unused maps to keep the linter quiet (they are useful when extending the schema)
  void columnsById;
  void cardsById;

  return lines.join('\r\n') + '\r\n';
}
