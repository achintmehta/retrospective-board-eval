function escape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function row(values) {
  return values.map(escape).join(',');
}

function fmtDate(ms) {
  if (!ms) return '';
  return new Date(ms).toISOString();
}

/**
 * Flat CSV: one row per card, plus one row per comment.
 * Columns: type, board, column, position, content, author, created_at, parent_card.
 */
export function boardToCsv(board) {
  const lines = [];
  lines.push(row(['type', 'board', 'column', 'position', 'content', 'author', 'created_at', 'parent_card']));

  for (const column of board.columns) {
    for (const card of column.cards) {
      lines.push(row([
        'card',
        board.title,
        column.title,
        card.position,
        card.content,
        card.authorName,
        fmtDate(card.createdAt),
        '',
      ]));
      for (const comment of card.comments) {
        lines.push(row([
          'comment',
          board.title,
          column.title,
          '',
          comment.content,
          comment.authorName,
          fmtDate(comment.createdAt),
          card.id,
        ]));
      }
    }
  }

  return lines.join('\r\n') + '\r\n';
}
