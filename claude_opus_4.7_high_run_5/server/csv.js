function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function isoOrEmpty(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toISOString();
  } catch {
    return '';
  }
}

function buildCsv(board) {
  const rows = [];
  rows.push([
    'board_title',
    'column_title',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ]);

  for (const column of board.columns || []) {
    if (!column.cards || column.cards.length === 0) {
      rows.push([board.title, column.title, '', '', '', '', '', '']);
      continue;
    }
    for (const card of column.cards) {
      const baseRow = [
        board.title,
        column.title,
        card.content,
        card.author_name,
        isoOrEmpty(card.created_at),
      ];
      if (!card.comments || card.comments.length === 0) {
        rows.push([...baseRow, '', '', '']);
        continue;
      }
      for (const comment of card.comments) {
        rows.push([
          ...baseRow,
          comment.content,
          comment.author_name,
          isoOrEmpty(comment.created_at),
        ]);
      }
    }
  }

  return rows.map((r) => r.map(escapeCsv).join(',')).join('\r\n') + '\r\n';
}

module.exports = { buildCsv, escapeCsv };
