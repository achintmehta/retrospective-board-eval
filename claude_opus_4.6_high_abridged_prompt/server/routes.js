import {
  createBoard, getAllBoards, getBoardById,
  createColumn, getBoardExportData,
} from './queries.js';

export function registerRoutes(app, db) {
  app.post('/api/boards', (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const board = createBoard(db, title.trim());
    res.status(201).json(board);
  });

  app.get('/api/boards', (req, res) => {
    const boards = getAllBoards(db);
    res.json(boards);
  });

  app.get('/api/boards/:id', (req, res) => {
    const board = getBoardById(db, req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(board);
  });

  app.post('/api/boards/:id/columns', (req, res) => {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Column title is required' });
    }
    const board = getBoardById(db, req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }
    const column = createColumn(db, req.params.id, title.trim());
    res.status(201).json(column);
  });

  app.get('/api/boards/:id/export', (req, res) => {
    const data = getBoardExportData(db, req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const headers = ['Board', 'Column', 'Card Content', 'Author', 'Created At', 'Comments'];
    const csvRows = [headers.join(',')];

    for (const row of data.rows) {
      csvRows.push([
        escapeCsv(row.board_title),
        escapeCsv(row.column),
        escapeCsv(row.card_content),
        escapeCsv(row.card_author),
        escapeCsv(row.card_created),
        escapeCsv(row.comments),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${data.title}.csv"`);
    res.send(csvRows.join('\n'));
  });
}

function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
