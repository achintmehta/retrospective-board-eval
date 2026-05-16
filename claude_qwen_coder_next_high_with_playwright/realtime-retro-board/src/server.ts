// @ts-nocheck

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

require('./db/schema');
const {
  getBoards,
  createBoard,
  getBoardById,
  getColumnsByBoardId,
  createColumn,
  getCardsByColumnId,
  createCard: dbCreateCard,
  moveCard,
  createComment: dbCreateComment,
} = require('./db/utils');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Serve static files from client build directory
app.use('/static', express.static(path.join(__dirname, '../client/dist')));

// API Routes

// Get all boards
app.get('/api/boards', (_req, res) => {
  try {
    const boards = getBoards();
    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// Create a new board
app.post('/api/boards', express.json(), (_req, res) => {
  try {
    const { title } = _req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const newBoard = createBoard(title);
    res.status(201).json(newBoard);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// Get board by ID with full data
app.get('/api/boards/:id', (req, res) => {
  try {
    const board = getBoardById(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const columns = getColumnsByBoardId(board.id);
    // Enrich with cards for each column
    const enrichedColumns = columns.map((col) => ({
      ...col,
      cards: getCardsByColumnId(col.id),
    }));

    res.json({
      ...board,
      columns: enrichedColumns,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

// Add column to board
app.post('/api/boards/:id/columns', express.json(), (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const board = getBoardById(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const column = createColumn(board.id, title);
    res.status(201).json(column);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add column' });
  }
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join_board', (boardId) => {
    socket.join(boardId);
    console.log(`Client ${socket.id} joined board: ${boardId}`);
  });

  socket.on('add_card', (data) => {
    try {
      const card = dbCreateCard(data.columnId, data.content, 'Anonymous');
      io.to(data.boardId).emit('card_added', { card });
    } catch (error) {
      console.error('Error adding card:', error);
    }
  });

  socket.on('move_card', (data) => {
    try {
      moveCard(data.cardId, data.toColumnId);
      io.to(data.boardId).emit('card_moved', {
        cardId: data.cardId,
        toColumnId: data.toColumnId,
      });
    } catch (error) {
      console.error('Error moving card:', error);
    }
  });

  socket.on('add_comment', (data) => {
    try {
      const comment = dbCreateComment(data.cardId, data.content, 'Anonymous');
      io.to(data.boardId).emit('comment_added', { comment });
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Export endpoint for CSV
app.get('/api/boards/:id/export', (req, res) => {
  try {
    const board = getBoardById(req.params.id);
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const columns = getColumnsByBoardId(board.id);

    // Build CSV content
    let csvContent = 'Column,Card Content,Author,Created At\n';
    for (const col of columns) {
      const cards = getCardsByColumnId(col.id);
      for (const card of cards) {
        csvContent += `"${col.title.replace(/"/g, '""')}",`;
        csvContent += `"${card.content.replace(/"/g, '""')}",`;
        csvContent += `"${card.authorName.replace(/"/g, '""')}",`;
        csvContent += `${card.createdAt}\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${board.title.replace(/\s+/g, '_')}_export.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export board' });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
