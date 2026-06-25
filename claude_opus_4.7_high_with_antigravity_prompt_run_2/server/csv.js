function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toIso(ts) {
  if (!ts) return '';
  try { return new Date(ts).toISOString(); } catch (e) { return ''; }
}

/**
 * Build a CSV representation of a board. Each row represents either a card or
 * a comment so the output captures the full hierarchy in a flat table.
 */
function buildBoardCsv(board) {
  const header = [
    'board_id',
    'board_title',
    'column_id',
    'column_title',
    'row_type',
    'card_id',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_id',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];

  const rows = [header.map(csvEscape).join(',')];

  for (const column of board.columns || []) {
    if (!column.cards || column.cards.length === 0) {
      rows.push(
        [
          board.id,
          board.title,
          column.id,
          column.title,
          'column-empty',
          '', '', '', '', '', '', '', '',
        ].map(csvEscape).join(','),
      );
      continue;
    }
    for (const card of column.cards) {
      rows.push(
        [
          board.id,
          board.title,
          column.id,
          column.title,
          'card',
          card.id,
          card.content,
          card.author_name,
          toIso(card.created_at),
          '', '', '', '',
        ].map(csvEscape).join(','),
      );
      for (const comment of card.comments || []) {
        rows.push(
          [
            board.id,
            board.title,
            column.id,
            column.title,
            'comment',
            card.id,
            card.content,
            card.author_name,
            toIso(card.created_at),
            comment.id,
            comment.content,
            comment.author_name,
            toIso(comment.created_at),
          ].map(csvEscape).join(','),
        );
      }
    }
  }

  return rows.join('\r\n') + '\r\n';
}

module.exports = { buildBoardCsv, csvEscape };
