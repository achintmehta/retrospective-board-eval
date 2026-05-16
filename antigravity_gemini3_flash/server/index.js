const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');
const queries = require('./queries');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Initialize DB
initDb();

// REST API Endpoints
app.post('/api/boards', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const boardId = await queries.createBoard(title);
    res.status(201).json({ id: boardId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

app.get('/api/boards', async (req, res) => {
  try {
    const boards = await queries.getBoards();
    res.json(boards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

app.get('/api/boards/:id', async (req, res) => {
  try {
    const board = await queries.getBoardWithDetails(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

app.post('/api/boards/:id/columns', async (req, res) => {
  try {
    const { title, position } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const columnId = await queries.createColumn(req.params.id, title, position || 0);
    res.status(201).json({ id: columnId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create column' });
  }
});

app.get('/api/boards/:id/export', async (req, res) => {
  try {
    const board = await queries.getBoardWithDetails(req.params.id);
    if (!board) return res.status(404).json({ error: 'Board not found' });

    let csvContent = 'Column,Author,Content,Comments\n';
    board.columns.forEach(col => {
      col.cards.forEach(card => {
        const comments = card.comments?.map(c => `[${c.author_name}: ${c.content}]`).join(' | ') || '';
        const escapedContent = card.content.replace(/"/g, '""');
        const escapedAuthor = card.author_name.replace(/"/g, '""');
        const escapedComments = comments.replace(/"/g, '""');
        csvContent += `"${col.title}","${escapedAuthor}","${escapedContent}","${escapedComments}"\n`;
      });
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${board.title.replace(/\s+/g, '_')}_retro.csv"`);
    res.send(csvContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export board' });
  }
});

// For any other request, serve the index.html from the client/dist
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Socket.io logic
io.on('connection', (socket) => {
  socket.on('join_board', (boardId) => {
    socket.join(boardId);
  });

  socket.on('add_card', async ({ boardId, columnId, content, authorName, position }) => {
    try {
      const cardId = await queries.createCard(columnId, content, authorName, position);
      const card = { id: cardId, column_id: columnId, content, author_name: authorName, position, comments: [] };
      io.to(boardId).emit('card_added', { columnId, card });
    } catch (err) {
      console.error('Socket add_card error:', err);
    }
  });

  socket.on('move_card', async ({ boardId, cardId, newColumnId, newPosition }) => {
    try {
      await queries.moveCard(cardId, newColumnId, newPosition);
      io.to(boardId).emit('card_moved', { cardId, newColumnId, newPosition });
    } catch (err) {
      console.error('Socket move_card error:', err);
    }
  });

  socket.on('add_comment', async ({ boardId, cardId, content, authorName }) => {
    try {
      const commentId = await queries.createComment(cardId, content, authorName);
      const comment = { id: commentId, card_id: cardId, content, author_name: authorName };
      io.to(boardId).emit('comment_added', { cardId, comment });
    } catch (err) {
      console.error('Socket add_comment error:', err);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
