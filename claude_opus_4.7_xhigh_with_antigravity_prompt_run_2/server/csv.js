const HEADERS = [
  'board_id',
  'board_title',
  'column_position',
  'column_title',
  'card_position',
  'card_id',
  'card_author',
  'card_created_at',
  'card_content',
  'comment_id',
  'comment_author',
  'comment_created_at',
  'comment_content',
];

function escape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function isoDate(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toISOString();
  } catch {
    return '';
  }
}

export function boardToCsv(board) {
  const lines = [HEADERS.join(',')];
  if (!board.columns?.length) {
    lines.push(
      [
        escape(board.id),
        escape(board.title),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(',')
    );
    return lines.join('\r\n') + '\r\n';
  }
  for (const column of board.columns) {
    if (!column.cards?.length) {
      lines.push(
        [
          escape(board.id),
          escape(board.title),
          escape(column.position),
          escape(column.title),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ].join(',')
      );
      continue;
    }
    for (const card of column.cards) {
      if (!card.comments?.length) {
        lines.push(
          [
            escape(board.id),
            escape(board.title),
            escape(column.position),
            escape(column.title),
            escape(card.position),
            escape(card.id),
            escape(card.author_name),
            escape(isoDate(card.created_at)),
            escape(card.content),
            '',
            '',
            '',
            '',
          ].join(',')
        );
        continue;
      }
      for (const comment of card.comments) {
        lines.push(
          [
            escape(board.id),
            escape(board.title),
            escape(column.position),
            escape(column.title),
            escape(card.position),
            escape(card.id),
            escape(card.author_name),
            escape(isoDate(card.created_at)),
            escape(card.content),
            escape(comment.id),
            escape(comment.author_name),
            escape(isoDate(comment.created_at)),
            escape(comment.content),
          ].join(',')
        );
      }
    }
  }
  return lines.join('\r\n') + '\r\n';
}
