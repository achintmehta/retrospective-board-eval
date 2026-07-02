import type { BoardWithChildren } from '../db/types.js';

function csvEscape(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function isoDate(ts: number): string {
  return new Date(ts).toISOString();
}

/**
 * Flattens a board into rows: one per card, one per comment. Type column
 * disambiguates so downstream tools can pivot easily.
 */
export function buildBoardCsv(board: BoardWithChildren): string {
  const header = [
    'type',
    'column',
    'content',
    'author',
    'created_at',
    'parent_card_content',
  ];

  const rows: string[] = [header.map(csvEscape).join(',')];

  for (const column of board.columns) {
    for (const card of column.cards) {
      rows.push(
        [
          'card',
          column.title,
          card.content,
          card.author_name,
          isoDate(card.created_at),
          '',
        ]
          .map(csvEscape)
          .join(',')
      );
      for (const comment of card.comments) {
        rows.push(
          [
            'comment',
            column.title,
            comment.content,
            comment.author_name,
            isoDate(comment.created_at),
            card.content,
          ]
            .map(csvEscape)
            .join(',')
        );
      }
    }
  }

  return rows.join('\r\n') + '\r\n';
}
