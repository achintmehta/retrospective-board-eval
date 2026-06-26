function esc(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildBoardCsv(board) {
  const rows = [
    [
      'board_title',
      'column_title',
      'card_content',
      'card_author',
      'card_created_at',
      'comment_content',
      'comment_author',
      'comment_created_at',
    ],
  ];

  for (const col of board.columns) {
    if (col.cards.length === 0) {
      rows.push([board.title, col.title, '', '', '', '', '', '']);
      continue;
    }
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        rows.push([
          board.title,
          col.title,
          card.content,
          card.author_name,
          new Date(card.created_at).toISOString(),
          '',
          '',
          '',
        ]);
      } else {
        for (const cm of card.comments) {
          rows.push([
            board.title,
            col.title,
            card.content,
            card.author_name,
            new Date(card.created_at).toISOString(),
            cm.content,
            cm.author_name,
            new Date(cm.created_at).toISOString(),
          ]);
        }
      }
    }
  }

  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}
