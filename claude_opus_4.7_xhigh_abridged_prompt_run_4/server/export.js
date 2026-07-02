function escapeCsvField(value) {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(fields) {
  return fields.map(escapeCsvField).join(',');
}

export function generateBoardCsv(board) {
  const lines = [];
  lines.push(row(['type', 'column', 'card_author', 'card_content', 'card_created_at', 'comment_author', 'comment_content', 'comment_created_at']));

  for (const column of board.columns) {
    if (column.cards.length === 0) {
      lines.push(row(['column', column.title, '', '', '', '', '', '']));
      continue;
    }
    for (const card of column.cards) {
      lines.push(
        row([
          'card',
          column.title,
          card.author_name,
          card.content,
          card.created_at,
          '',
          '',
          ''
        ])
      );
      for (const comment of card.comments || []) {
        lines.push(
          row([
            'comment',
            column.title,
            card.author_name,
            card.content,
            card.created_at,
            comment.author_name,
            comment.content,
            comment.created_at
          ])
        );
      }
    }
  }

  return lines.join('\r\n') + '\r\n';
}
