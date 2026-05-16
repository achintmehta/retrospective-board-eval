import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import {
  createBoard,
  getAllBoards,
  getBoardWithDetails,
  createColumn,
  getBoardExportData,
} from '../queries';

export function boardRoutes(db: Database.Database): Router {
  const router = Router();

  // POST /api/boards - Create a new board
  router.post('/', (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }
      const board = createBoard(db, title.trim());
      res.status(201).json(board);
    } catch (err) {
      console.error('Error creating board:', err);
      res.status(500).json({ error: 'Failed to create board' });
    }
  });

  // GET /api/boards - Fetch all boards
  router.get('/', (_req: Request, res: Response) => {
    try {
      const boards = getAllBoards(db);
      res.json(boards);
    } catch (err) {
      console.error('Error fetching boards:', err);
      res.status(500).json({ error: 'Failed to fetch boards' });
    }
  });

  // GET /api/boards/:id - Fetch a specific board with details
  router.get('/:id', (req: Request, res: Response) => {
    try {
      const board = getBoardWithDetails(db, req.params.id as string);
      if (!board) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }
      res.json(board);
    } catch (err) {
      console.error('Error fetching board:', err);
      res.status(500).json({ error: 'Failed to fetch board' });
    }
  });

  // POST /api/boards/:id/columns - Create a column
  router.post('/:id/columns', (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'Column title is required' });
        return;
      }
      const column = createColumn(db, req.params.id as string, title.trim());
      res.status(201).json(column);
    } catch (err) {
      console.error('Error creating column:', err);
      res.status(500).json({ error: 'Failed to create column' });
    }
  });

  // GET /api/boards/:id/export - Export board data as CSV
  router.get('/:id/export', (req: Request, res: Response) => {
    try {
      const data = getBoardExportData(db, req.params.id as string);
      if (!data) {
        res.status(404).json({ error: 'Board not found' });
        return;
      }

      const { board, rows } = data;

      // Build CSV
      const headers = [
        'Column',
        'Card Content',
        'Card Author',
        'Card Created',
        'Comment',
        'Comment Author',
        'Comment Created',
      ];

      const csvRows = [headers.join(',')];
      for (const row of rows as any[]) {
        csvRows.push(
          [
            escapeCsv(row.column_title || ''),
            escapeCsv(row.card_content || ''),
            escapeCsv(row.card_author || ''),
            escapeCsv(row.card_created_at || ''),
            escapeCsv(row.comment_content || ''),
            escapeCsv(row.comment_author || ''),
            escapeCsv(row.comment_created_at || ''),
          ].join(',')
        );
      }

      const csv = csvRows.join('\n');
      const filename = `${board.title.replace(/[^a-z0-9]/gi, '_')}_export.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error('Error exporting board:', err);
      res.status(500).json({ error: 'Failed to export board' });
    }
  });

  return router;
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
