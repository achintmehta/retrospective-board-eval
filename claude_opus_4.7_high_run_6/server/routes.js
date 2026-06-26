const {
  createBoard,
  listBoards,
  getBoard,
  createColumn,
} = require('./db');

function registerRestRoutes(app) {
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  // List all boards
  app.get('/api/boards', (req, res) => {
    res.json({ boards: listBoards() });
  });

  // Create a new board
  app.post('/api/boards', (req, res) => {
    const title = (req.body?.title || '').trim();
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    const board = createBoard(title);
    res.status(201).json({ board });
  });

  // Fetch a single board with its columns, cards, and comments
  app.get('/api/boards/:id', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    res.json({ board });
  });

  // Create a new column on a board
  app.post('/api/boards/:id/columns', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const title = (req.body?.title || '').trim();
    if (!title) return res.status(400).json({ error: 'title is required' });
    const column = createColumn(req.params.id, title);
    res.status(201).json({ column });
  });

  // Export board to CSV
  app.get('/api/boards/:id/export', (req, res) => {
    const board = getBoard(req.params.id);
    if (!board) return res.status(404).json({ error: 'board not found' });
    const csv = buildBoardCsv(board);
    const safeTitle = board.title.replace(/[^a-z0-9\-]+/gi, '_').slice(0, 60);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="retro_${safeTitle || board.id}.csv"`
    );
    res.send(csv);
  });
}

function csvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildBoardCsv(board) {
  const header = [
    'column',
    'card_content',
    'card_author',
    'card_created_at',
    'comment_content',
    'comment_author',
    'comment_created_at',
  ];

  const lines = [header.map(csvCell).join(',')];
  const columnsById = new Map(board.columns.map((c) => [c.id, c]));
  const commentsByCard = new Map();
  for (const cm of board.comments) {
    if (!commentsByCard.has(cm.card_id)) commentsByCard.set(cm.card_id, []);
    commentsByCard.get(cm.card_id).push(cm);
  }

  if (!board.cards.length) {
    // Output column rows so an empty board still produces a useful CSV
    for (const col of board.columns) {
      lines.push([col.title, '', '', '', '', '', ''].map(csvCell).join(','));
    }
  }

  for (const card of board.cards) {
    const col = columnsById.get(card.column_id);
    const colTitle = col ? col.title : '';
    const cardComments = commentsByCard.get(card.id) || [];
    if (cardComments.length === 0) {
      lines.push(
        [
          colTitle,
          card.content,
          card.author_name,
          card.created_at,
          '',
          '',
          '',
        ]
          .map(csvCell)
          .join(',')
      );
    } else {
      for (const cm of cardComments) {
        lines.push(
          [
            colTitle,
            card.content,
            card.author_name,
            card.created_at,
            cm.content,
            cm.author_name,
            cm.created_at,
          ]
            .map(csvCell)
            .join(',')
        );
      }
    }
  }

  return lines.join('\r\n');
}

module.exports = { registerRestRoutes, buildBoardCsv };
