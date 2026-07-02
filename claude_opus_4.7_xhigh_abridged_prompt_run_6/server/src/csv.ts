import type { BoardWithChildren } from './types.js';

function escape(field: string | number): string {
  const str = String(field ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function isoDate(ts: number): string {
  return new Date(ts).toISOString();
}

export function boardToCsv(board: BoardWithChildren): string {
  const header = [
    'board_title',
    'column',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ].join(',');

  const lines: string[] = [header];

  for (const col of board.columns) {
    if (col.cards.length === 0) {
      lines.push(
        [board.title, col.title, '', '', '', '', '', '']
          .map(escape)
          .join(',')
      );
      continue;
    }
    for (const card of col.cards) {
      if (card.comments.length === 0) {
        lines.push(
          [
            board.title,
            col.title,
            card.content,
            card.author_name,
            isoDate(card.created_at),
            '',
            '',
            '',
          ]
            .map(escape)
            .join(',')
        );
      } else {
        for (const cm of card.comments) {
          lines.push(
            [
              board.title,
              col.title,
              card.content,
              card.author_name,
              isoDate(card.created_at),
              cm.content,
              cm.author_name,
              isoDate(cm.created_at),
            ]
              .map(escape)
              .join(',')
          );
        }
      }
    }
  }

  return lines.join('\r\n') + '\r\n';
}
