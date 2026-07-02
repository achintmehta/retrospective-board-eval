function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function formatTs(ts) {
  if (!ts) return '';
  return new Date(ts).toISOString();
}

export function buildCsv(board) {
  const header = [
    'board_id',
    'board_title',
    'column_id',
    'column_title',
    'column_position',
    'card_id',
    'card_content',
    'card_author',
    'card_position',
    'card_created_at',
    'comment_id',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];
  const lines = [header.map(escapeCell).join(',')];

  const boardBase = [board.id, board.title];

  if (!board.columns || board.columns.length === 0) {
    lines.push([...boardBase, '', '', '', '', '', '', '', '', '', '', '', ''].map(escapeCell).join(','));
    return lines.join('\r\n') + '\r\n';
  }

  for (const col of board.columns) {
    const colBase = [col.id, col.title, col.position];
    if (!col.cards || col.cards.length === 0) {
      lines.push([...boardBase, ...colBase, '', '', '', '', '', '', '', '', ''].map(escapeCell).join(','));
      continue;
    }
    for (const card of col.cards) {
      const cardBase = [card.id, card.content, card.author_name, card.position, formatTs(card.created_at)];
      if (!card.comments || card.comments.length === 0) {
        lines.push([...boardBase, ...colBase, ...cardBase, '', '', '', ''].map(escapeCell).join(','));
        continue;
      }
      for (const comment of card.comments) {
        lines.push(
          [
            ...boardBase,
            ...colBase,
            ...cardBase,
            comment.id,
            comment.content,
            comment.author_name,
            formatTs(comment.created_at),
          ]
            .map(escapeCell)
            .join(',')
        );
      }
    }
  }

  return lines.join('\r\n') + '\r\n';
}
