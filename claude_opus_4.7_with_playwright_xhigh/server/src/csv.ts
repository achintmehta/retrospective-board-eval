import {
  getBoardSummary,
  getColumnsByBoard,
  getCardsByBoard,
  getCommentsByBoard,
} from './db.js';

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(values: unknown[]): string {
  return values.map(escapeCsv).join(',') + '\r\n';
}

export async function generateBoardCsv(boardId: string): Promise<string | null> {
  const board = await getBoardSummary(boardId);
  if (!board) return null;

  const columns = await getColumnsByBoard(boardId);
  const cards = await getCardsByBoard(boardId);
  const comments = await getCommentsByBoard(boardId);

  const colMap = new Map(columns.map((c) => [c.id, c]));
  const cardMap = new Map(cards.map((c) => [c.id, c]));

  let csv = '';
  csv += row([
    'type',
    'board_title',
    'column',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ]);

  for (const card of cards) {
    const col = colMap.get(card.column_id);
    csv += row([
      'card',
      board.title,
      col?.title ?? '',
      card.content,
      card.author_name,
      card.created_at,
      '',
      '',
      '',
    ]);
  }

  for (const comment of comments) {
    const card = cardMap.get(comment.card_id);
    const col = card ? colMap.get(card.column_id) : undefined;
    csv += row([
      'comment',
      board.title,
      col?.title ?? '',
      card?.content ?? '',
      card?.author_name ?? '',
      card?.created_at ?? '',
      comment.content,
      comment.author_name,
      comment.created_at,
    ]);
  }

  return csv;
}
