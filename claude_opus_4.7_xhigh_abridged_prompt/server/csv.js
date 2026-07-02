const HEADER = [
  'board_title',
  'column',
  'card_content',
  'card_author',
  'card_created_at',
  'comment_content',
  'comment_author',
  'comment_created_at',
];

function escapeField(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function iso(ms) {
  if (ms === null || ms === undefined) return '';
  const d = new Date(Number(ms));
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function boardCsv({ board, rows }) {
  const lines = [HEADER.join(',')];
  if (!rows || rows.length === 0) {
    // Still write header with a placeholder row so users get a meaningful file.
    lines.push([board.title, '', '', '', '', '', '', ''].map(escapeField).join(','));
    return lines.join('\r\n') + '\r\n';
  }
  for (const row of rows) {
    lines.push(
      [
        board.title,
        row.column_title,
        row.card_content,
        row.card_author,
        iso(row.card_created_at),
        row.comment_content,
        row.comment_author,
        iso(row.comment_created_at),
      ]
        .map(escapeField)
        .join(','),
    );
  }
  return lines.join('\r\n') + '\r\n';
}
