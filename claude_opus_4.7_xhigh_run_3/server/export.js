function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values) {
  return values.map(escapeCell).join(',');
}

function fmtDate(ms) {
  if (!ms) return '';
  return new Date(ms).toISOString();
}

export function csvForBoard(board) {
  const lines = [];
  const header = [
    'board_title',
    'column_title',
    'card_id',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_id',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];
  lines.push(toCsvRow(header));

  if (!board.columns || board.columns.length === 0) {
    lines.push(toCsvRow([board.title]));
    return lines.join('\r\n') + '\r\n';
  }

  for (const column of board.columns) {
    if (!column.cards || column.cards.length === 0) {
      lines.push(toCsvRow([board.title, column.title]));
      continue;
    }
    for (const card of column.cards) {
      const cardRow = [
        board.title,
        column.title,
        card.id,
        card.content,
        card.authorName,
        fmtDate(card.createdAt),
      ];
      if (!card.comments || card.comments.length === 0) {
        lines.push(toCsvRow(cardRow));
        continue;
      }
      for (const comment of card.comments) {
        lines.push(
          toCsvRow([
            ...cardRow,
            comment.id,
            comment.content,
            comment.authorName,
            fmtDate(comment.createdAt),
          ]),
        );
      }
    }
  }
  return lines.join('\r\n') + '\r\n';
}
