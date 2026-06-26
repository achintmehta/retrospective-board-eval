function escape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function boardToCsv(board) {
  const header = [
    'board_title',
    'column',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];

  const rows = [header.join(',')];

  for (const column of board.columns) {
    if (column.cards.length === 0) {
      rows.push([board.title, column.title, '', '', '', '', '', ''].map(escape).join(','));
      continue;
    }
    for (const card of column.cards) {
      if (card.comments.length === 0) {
        rows.push(
          [
            board.title,
            column.title,
            card.content,
            card.author_name,
            card.created_at,
            '',
            '',
            '',
          ]
            .map(escape)
            .join(',')
        );
      } else {
        for (const comment of card.comments) {
          rows.push(
            [
              board.title,
              column.title,
              card.content,
              card.author_name,
              card.created_at,
              comment.content,
              comment.author_name,
              comment.created_at,
            ]
              .map(escape)
              .join(',')
          );
        }
      }
    }
  }

  return rows.join('\r\n') + '\r\n';
}
