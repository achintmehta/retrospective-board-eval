import { createBoard, getAllBoards, getBoardFull, createColumn } from './queries.js';

export function registerRoutes(app, db) {
  // Create a new board
  app.post('/api/boards', (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const board = createBoard(db, title.trim());
    res.status(201).json(board);
  });

  // Fetch all boards
  app.get('/api/boards', (_req, res) => {
    const boards = getAllBoards(db);
    res.json(boards);
  });

  // Fetch a specific board with columns, cards, and comments
  app.get('/api/boards/:id', (req, res) => {
    const board = getBoardFull(db, req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(board);
  });

  // Create a column for a board
  app.post('/api/boards/:id/columns', (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Column title is required' });
    }
    const column = createColumn(db, req.params.id, title.trim());
    res.status(201).json(column);
  });

  // CSV export
  app.get('/api/boards/:id/export', (req, res) => {
    const board = getBoardFull(db, req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const rows = [['Column', 'Card', 'Author', 'Created At', 'Comments']];
    for (const col of board.columns) {
      for (const card of col.cards) {
        const commentsText = card.comments
          .map(c => `${c.author_name}: ${c.content}`)
          .join(' | ');
        rows.push([
          csvEscape(col.title),
          csvEscape(card.content),
          csvEscape(card.author_name),
          card.created_at,
          csvEscape(commentsText),
        ]);
      }
    }

    const csv = rows.map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${board.title}-export.csv"`);
    res.send(csv);
  });
}

function csvEscape(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
