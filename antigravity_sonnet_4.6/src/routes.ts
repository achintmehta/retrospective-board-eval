import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllBoards,
  createBoard,
  getFullBoard,
  createColumn,
  getColumnsByBoardId,
  getBoardExportData,
  getBoardById,
} from './db';

const router = Router();

// ─── Boards ───────────────────────────────────────────────────────────────────

// GET /api/boards — List all boards
router.get('/boards', (_req: Request, res: Response) => {
  const boards = getAllBoards();
  res.json(boards);
});

// POST /api/boards — Create a new board
router.post('/boards', (req: Request, res: Response) => {
  const { title, columns } = req.body as { title: string; columns?: string[] };
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Board title is required' });
  }

  const boardId = uuidv4();
  const board = createBoard(boardId, title.trim());

  // Create default or provided columns
  const columnTitles = columns && columns.length > 0
    ? columns
    : ['Went Well', 'Needs Improvement', 'Action Items'];

  columnTitles.forEach((colTitle: string, idx: number) => {
    createColumn(uuidv4(), boardId, colTitle, idx);
  });

  const fullBoard = getFullBoard(boardId);
  return res.status(201).json(fullBoard);
});

// GET /api/boards/:id — Fetch a specific board with columns, cards, comments
router.get('/boards/:id', (req: Request, res: Response) => {
  const board = getFullBoard(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }
  return res.json(board);
});

// ─── Columns ──────────────────────────────────────────────────────────────────

// POST /api/boards/:id/columns — Add a column to a board
router.post('/boards/:id/columns', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title } = req.body as { title: string };

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ error: 'Column title is required' });
  }

  const board = getBoardById(id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const existingColumns = getColumnsByBoardId(id);
  const position = existingColumns.length;
  const column = createColumn(uuidv4(), id, title.trim(), position);

  return res.status(201).json(column);
});

// ─── Export ───────────────────────────────────────────────────────────────────

// GET /api/boards/:id/export — Export board as CSV
router.get('/boards/:id/export', (req: Request, res: Response) => {
  const board = getBoardById(req.params.id);
  if (!board) {
    return res.status(404).json({ error: 'Board not found' });
  }

  const rows = getBoardExportData(req.params.id);
  const headers = [
    'board_title',
    'column_title',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];

  const escapeCsv = (val: string): string => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => escapeCsv(String(row[h as keyof typeof row] ?? ''))).join(',')
    ),
  ];

  const csvContent = csvLines.join('\n');
  const filename = `retro-board-${board.title.replace(/[^a-z0-9]/gi, '-')}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csvContent);
});

export default router;
