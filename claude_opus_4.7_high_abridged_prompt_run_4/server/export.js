function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells) {
  return cells.map(csvEscape).join(',') + '\r\n';
}

export function streamBoardCsv(board, res) {
  res.write(row(['board_id', 'board_title', 'column', 'card_content', 'card_author', 'card_created_at', 'comment_content', 'comment_author', 'comment_created_at']));
  const iso = (ms) => new Date(ms).toISOString();
  for (const column of board.columns) {
    if (column.cards.length === 0) {
      res.write(row([board.id, board.title, column.title, '', '', '', '', '', '']));
      continue;
    }
    for (const card of column.cards) {
      if (card.comments.length === 0) {
        res.write(
          row([
            board.id,
            board.title,
            column.title,
            card.content,
            card.author_name,
            iso(card.created_at),
            '',
            '',
            '',
          ]),
        );
        continue;
      }
      for (const comment of card.comments) {
        res.write(
          row([
            board.id,
            board.title,
            column.title,
            card.content,
            card.author_name,
            iso(card.created_at),
            comment.content,
            comment.author_name,
            iso(comment.created_at),
          ]),
        );
      }
    }
  }
  res.end();
}
