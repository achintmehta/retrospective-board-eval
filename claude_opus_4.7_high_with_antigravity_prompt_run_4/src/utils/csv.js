function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function isoOrEmpty(ts) {
  if (!ts) return '';
  return new Date(Number(ts)).toISOString();
}

function boardToCsv({ board, rows }) {
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

  const lines = [header.join(',')];
  for (const row of rows) {
    if (!row.column_title) continue;
    lines.push(
      [
        board.title,
        row.column_title,
        row.card_content || '',
        row.card_author || '',
        isoOrEmpty(row.card_created_at),
        row.comment_content || '',
        row.comment_author || '',
        isoOrEmpty(row.comment_created_at),
      ]
        .map(escapeCsv)
        .join(',')
    );
  }
  return lines.join('\n') + '\n';
}

module.exports = { boardToCsv, escapeCsv };
