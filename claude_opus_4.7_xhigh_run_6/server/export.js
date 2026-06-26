function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values) {
  return values.map(csvEscape).join(',');
}

function buildBoardCsv(board) {
  const header = [
    'board_id',
    'board_title',
    'column_id',
    'column_title',
    'row_type',
    'item_id',
    'parent_card_id',
    'author_name',
    'created_at',
    'content',
  ];
  const lines = [csvRow(header)];

  for (const column of board.columns || []) {
    for (const card of column.cards || []) {
      lines.push(
        csvRow([
          board.id,
          board.title,
          column.id,
          column.title,
          'card',
          card.id,
          '',
          card.author_name,
          new Date(card.created_at).toISOString(),
          card.content,
        ])
      );
      for (const comment of card.comments || []) {
        lines.push(
          csvRow([
            board.id,
            board.title,
            column.id,
            column.title,
            'comment',
            comment.id,
            card.id,
            comment.author_name,
            new Date(comment.created_at).toISOString(),
            comment.content,
          ])
        );
      }
    }
  }
  return lines.join('\r\n') + '\r\n';
}

module.exports = { buildBoardCsv };
