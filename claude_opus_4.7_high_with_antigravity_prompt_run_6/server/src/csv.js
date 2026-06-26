function escape(value) {
  const s = value == null ? '' : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function boardToCsv(board) {
  const rows = [];
  rows.push(
    ['Type', 'Column', 'Card', 'Author', 'CreatedAt', 'Content'].map(escape).join(',')
  );
  for (const column of board.columns) {
    for (const card of column.cards) {
      rows.push(
        [
          'card',
          column.title,
          card.id.slice(0, 8),
          card.author_name,
          card.created_at,
          card.content,
        ]
          .map(escape)
          .join(',')
      );
      for (const comment of card.comments) {
        rows.push(
          [
            'comment',
            column.title,
            card.id.slice(0, 8),
            comment.author_name,
            comment.created_at,
            comment.content,
          ]
            .map(escape)
            .join(',')
        );
      }
    }
  }
  return rows.join('\r\n') + '\r\n';
}
