function escape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Quote if contains comma, quote, newline, or carriage return.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function row(values) {
  return values.map(escape).join(',');
}

function isoOrEmpty(ts) {
  return ts ? new Date(ts).toISOString() : '';
}

/**
 * Renders a board into CSV. Each row is either a card or a comment; the type
 * column distinguishes them so spreadsheets can group/filter on it.
 */
function boardToCsv(board) {
  const lines = [
    row([
      'board_title',
      'column',
      'type',
      'content',
      'author',
      'created_at',
      'parent_card_content',
    ]),
  ];
  for (const col of board.columns) {
    for (const card of col.cards) {
      lines.push(
        row([
          board.title,
          col.title,
          'card',
          card.content,
          card.author_name,
          isoOrEmpty(card.created_at),
          '',
        ])
      );
      for (const comment of card.comments || []) {
        lines.push(
          row([
            board.title,
            col.title,
            'comment',
            comment.content,
            comment.author_name,
            isoOrEmpty(comment.created_at),
            card.content,
          ])
        );
      }
    }
  }
  return lines.join('\r\n') + '\r\n';
}

module.exports = { boardToCsv };
